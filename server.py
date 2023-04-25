from flask import Flask, render_template, request, abort, redirect, jsonify
from flask_socketio import SocketIO, send,join_room,leave_room,close_room,disconnect,rooms
from models.auth import Auth
from models.user import GroupChat, Message, User, UserGroupChatAssociation
import datetime
from sqlalchemy import or_,not_
import os
from werkzeug.utils import secure_filename


app = Flask(__name__)
app.config["SECRET"] = "youcannevergetthissecretekey"
Socketio = SocketIO(app,cors_allowed_origins="*")
AUTH = Auth()
db_sess = AUTH.db_session()
app.config['UPLOAD_FOLDER'] = "static/media_upload"


@app.before_request
def before_req():
    if request.path.startswith('/static/'):
        return None
    exclude = [
        '/signup',
        '/signin',
        '/reset-password',
    ]
    if AUTH.require_auth(request.path, exclude):
        if not request.cookies.get("session_id"):
            return redirect("/signin")
        if AUTH.current_user(request) is None:
            return redirect("/signin")
        setattr(request,"current_user",AUTH.current_user(request))
        setattr(request,"last_seen",datetime.datetime.now())
    return None

@app.context_processor
def con_pro():
    if hasattr(request,"current_user"):
        request.current_user.last_seen = request.last_seen
        db_sess.add(request.current_user)
        db_sess.commit()
        return {"last_seen":request.last_seen,"c_user":request.current_user}
    return {}

@Socketio.on("message")
def message_handler(data):
    send(message=data,to=data['room'], include_self=False)
    user = db_sess.query(User).filter_by(username=data["username"]).first()
    grp = db_sess.query(GroupChat).filter_by(name=data["room"]).first()
    mess = Message(sender_id=user.id,group_chat_id=grp.id,text=data["text"])
    db_sess.add(mess)
    db_sess.commit()



@Socketio.on('join')
def on_join(data):
    room = data['room']
    join_room(room)
    gp = db_sess.query(GroupChat).filter_by(name=data['room']).first()
    if not gp:
        gp = GroupChat(name=room)
        db_sess.add(gp)
        db_sess.commit()
    user = db_sess.query(User).filter_by(username=data["username"]).first()
    if not db_sess.query(UserGroupChatAssociation).filter_by(user_id=user.id,group_chat_id=gp.id).first():
        member = UserGroupChatAssociation(user_id=user.id,group_chat_id=gp.id)
        db_sess.add(member)
        db_sess.commit()
        if data.get("members"):
            for member in data["members"]:
                mem = db_sess.query(User).filter_by(username=member).first()
                if not db_sess.query(UserGroupChatAssociation).filter_by(user_id=mem.id,group_chat_id=gp.id).first():
                    mem = UserGroupChatAssociation(user_id=mem.id,group_chat_id=gp.id)
                    db_sess.add(mem)
        db_sess.commit()

def group_exists(group_name):
    rooms = Socketio.server.manager.rooms
    return group_name in rooms["/"]


@Socketio.on('private_join')
def private_join_handler(data):
    sender = data["sender"]
    receiver = data["receiver"]
    if group_exists(sender+receiver):
        join_room(sender+receiver)
    elif group_exists(receiver+sender):
        join_room(receiver+sender)
    else:
        join_room(receiver+sender)


@Socketio.on('private_msgs')
def private_msgs_handler(data):
    sender = data["sender"]
    receiver = data["receiver"]
    if group_exists(sender+receiver):
        send(message=data,to=sender+receiver, include_self=False)
    elif group_exists(receiver+sender):
        send(message=data,to=receiver+sender, include_self=False)

    sender = db_sess.query(User).filter_by(username=data["sender"]).first()
    receiver = db_sess.query(User).filter_by(username=data["receiver"]).first()
    mess = Message(sender_id=sender.id,receiver_id=receiver.id,text=data["text"])
    db_sess.add(mess)
    db_sess.commit()


@Socketio.on('leave')
def leave(data):
    if data.get("room"):
        leave_room(data["room"])
    else:
        leave_room(data["sender"]+data["receiver"])
        leave_room(data["receiver"]+data["sender"])



@app.route("/online_stat/<name>", methods=["GET"], strict_slashes=False)
def get_online_status(name):
    user = db_sess.query(User).filter_by(username=name).first()
    if user:
        three_minutes_ago = datetime.datetime.now() - datetime.timedelta(minutes=3)
        if user.last_seen < three_minutes_ago:
            return jsonify({"online":False})
        return jsonify({"online":True})
    return jsonify({"online":None})


@app.route("/dm/<name>", methods=["GET"], strict_slashes=False)
def get_chat(name):
    c_user = request.current_user
    o_user = db_sess.query(User).filter_by(username=name).first()
    messages = db_sess.query(Message).filter(
    (Message.sender_id == c_user.id) & (Message.receiver_id == o_user.id) |
    (Message.sender_id == o_user.id) & (Message.receiver_id == c_user.id)).\
        order_by(Message.created_at.asc()).all()
    details = []
    for mes in messages:
        details.append({
            "sender":mes.msg_sender.username,
            "receiver":mes.msg_receiver.username,
            "time":mes.created_at,
            "text":mes.text,
            "c_pathd":c_user.image_path,
            "o_pathd":o_user.image_path})
    details.append({"username":o_user.username,"address":o_user.Address,
                    "phone":o_user.mobile_number,"email":o_user.email,"path":o_user.image_path})
    return jsonify(details)

@app.route("/group/<name>", methods=["GET"], strict_slashes=False)
def get_group_chat(name):
    gp = db_sess.query(GroupChat).filter_by(name=name).first()
    if gp:
        details = []
        for mes in gp.messages:
            details.append({
                "sender_image": mes.msg_sender.image_path,
                "sender":mes.msg_sender.username,
                "time":mes.created_at,
                "text":mes.text})
        details.append({"img_path":gp.image_path})
        return jsonify(details)
    return jsonify(None)

@app.route("/user/",methods=["POST"], strict_slashes=False)
def users():
    details ={**request.form}
    if "c_password" in details:
        if not AUTH.change_password(request.current_user,request.form["c_password"],request.form["n_password"]):
            abort(403)
    else:
        AUTH.update_user(request.current_user.id,details)
    return jsonify({"work":"done"}),200


@app.route("/", methods=["GET"], strict_slashes=False)
def index():
    user = request.current_user
    subquery = db_sess.query(UserGroupChatAssociation.group_chat_id).\
        filter(UserGroupChatAssociation.user_id == user.id).subquery()
    other_groups = db_sess.query(GroupChat).outerjoin(subquery, GroupChat.id == subquery.c.group_chat_id).\
        filter(subquery.c.group_chat_id == None).all()
    user_id = user.id
    users = db_sess.query(User).\
    join(Message, or_(User.id == Message.sender_id, User.id == Message.receiver_id)).\
    filter(or_(Message.sender_id == user_id, Message.receiver_id == user_id)).\
    distinct().all()

    context = {
        "all_users":db_sess.query(User).all(),
        "users_wit_dm": [],
        "my_groups": user.group_chats,
        "other_groups": other_groups,
    }

    for us in users:
        message = db_sess.query(Message).\
        filter(
            ((Message.sender_id == user_id) & (Message.receiver_id == us.id)) | 
            ((Message.sender_id == us.id) & (Message.receiver_id == user_id))
        ).order_by(Message.created_at.desc()).first()
        if message:
           context["users_wit_dm"].append({
                "username":us.username,
                "image_path":us.image_path,
                "sender":message.msg_sender.username,
                "receiver":message.msg_receiver.username,
                "text":message.text,
                "time":str(message.created_at),
                })
           
    existing_user_ids = [u.id for u in users]
    new_users = db_sess.query(User).filter(not_(User.id.in_(existing_user_ids)))

    context["other_users"] = new_users
    return render_template("chat.html",**context)

@app.route("/upload",methods=["POST"], strict_slashes=False)
def upload_img():
    file = request.files['file']
    groupname = request.form.get('groupname')
    if groupname:
        filename = secure_filename(file.filename)
        file.save(os.path.join(app.config['UPLOAD_FOLDER'], filename))
        group = db_sess.query(GroupChat).filter_by(name=groupname).first()
        if group:
            group.image_name = filename
            group.image_path = os.path.join(app.config['UPLOAD_FOLDER'],filename)
            db_sess.add(group)
            db_sess.commit()
            return jsonify({"path":filename})
    else:
        user = request.current_user
        filename = secure_filename(file.filename)
        file.save(os.path.join(app.config['UPLOAD_FOLDER'], filename))
        user.image_name = filename
        user.image_path = os.path.join(app.config['UPLOAD_FOLDER'],filename)
        db_sess.add(user)
        db_sess.commit()
        return jsonify({"path":user.image_path})
    return jsonify({"work":"incomplete"})



@app.route("/signup", methods=["POST","GET"], strict_slashes=False)
def signup():
    """POST /users"""
    if request.method == "POST":
        username = request.form.get("username")
        email = request.form.get("email")
        password = request.form.get("password")

        AUTH.register_user(username, email, password)
        return redirect("/signin")

    return render_template("signup.html")

@app.route("/signin", methods=["POST","GET"], strict_slashes=False)
def signin() -> str:
    """GET POST/signup"""
    if request.method == "POST":
        email = request.form.get("email")
        password = request.form.get("password")

        if not AUTH.valid_login(email, password):
            abort(401)

        session_id = AUTH.create_session(email)
        resp = redirect("/")
        resp.set_cookie("session_id", session_id)
        return resp
    return render_template("signin.html")


@app.route("/signout", methods=["GET"], strict_slashes=False)
def signout():
    """
    Log out a logged in user and destroy their db_sess
    """
    user_id = request.current_user.id
    AUTH.destroy_session(user_id)
    return redirect("signin")


@app.route("/reset-password")
def reset_password():
    return render_template("reset-password.html")



if __name__== "__main__":
    Socketio.run(app=app,host="localhost",debug=True)
