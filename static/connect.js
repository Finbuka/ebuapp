socket = io.connect("http://127.0.0.1:5000");


document.querySelectorAll("li.contacts-item.friends").forEach(e=>{
  let us_on = e.querySelector("h6.chat-name").innerHTML
  time_date = e.querySelector("div.chat-time").innerHTML
  if(us_on)
    $.get(`online_stat/${us_on}`,(data)=>{
      if (data["online"] === true)
      e.querySelector("div.avatar").setAttribute("class","avatar avatar-online")
        else
        e.querySelector("div.avatar").setAttribute("class","avatar avatar-offline")
      });

  const now = new Date(time_date);
  const hours = now.getHours();
  const minutes = now.getMinutes();
  const ampm = hours >= 12 ? 'pm' : 'am';
  const tim = `${now.getMonth()+1}-${now.getDate()} ${hours>12?hours-12:hours}:${minutes}${ampm}`;
  e.querySelector("div.chat-time").innerHTML = tim
});

//check for online users every 2 minutes
setInterval(()=>{
  document.querySelectorAll("li.contacts-item.friends").forEach(e=>{
    let us_on = e.querySelector("h6.chat-name").innerHTML
    time_date = e.querySelector("div.chat-time").innerHTML
    if(us_on)
      $.get(`online_stat/${us_on}`,(data)=>{
        if (data["online"] === true)
          e.querySelector("div.avatar").setAttribute("class","avatar avatar-online")
          else
          e.querySelector("div.avatar").setAttribute("class","avatar avatar-offline")
      });
    });
},2 * 30 * 1000);


document.querySelectorAll("li.contacts-item.groups").forEach(e=>{
  time_date = e.querySelector("div.chat-time span").innerHTML
  const now = new Date(time_date);
  const hours = now.getHours();
  const minutes = now.getMinutes();
  const ampm = hours >= 12 ? 'pm' : 'am';
  const tim = `${now.getMonth()+1}-${now.getDate()} ${hours>12?hours-12:hours}:${minutes}${ampm}`;
  e.querySelector("div.chat-time").innerHTML = tim
})


// Add the event listener to the parent element that contains both buttons
document.querySelector("#btn-create-group").addEventListener("click", function(e) {
  // Check if the event target matches the selector for the button you want to add the event listener to
  let groupname = document.querySelector("input#groupName").value.trim()
  if (groupname.lenght!==0)
  if(document.querySelector("input[type=hidden]#actual-step").getAttribute("value")==="2"){
    e.preventDefault();
  
      const checkboxes = document.querySelectorAll("#createGroup .modal-content ul.list-group li input[type='checkbox']");
      const selectedItems = [];
      
      checkboxes.forEach(function(checkbox) {
        if (checkbox.checked) {
          const listItem = checkbox.closest('.list-group-item');
          const textElement = listItem.querySelector('.text-reset');
          const text = textElement.textContent.trim();
          selectedItems.push(text);
        }
      });  
      socket.emit('join', {'room': groupname,"username":c_username,"members":selectedItems});

      
      const fileInput = document.querySelector('input[type="file"]#profilePictureInput');
      const file = fileInput.files[0];
      if (file) {
        const formData = new FormData();
        formData.append('groupname', groupname);
        formData.append('file', file);
        
        $.ajax({
          url: 'upload/',
          type: 'POST',
          data: formData,
          processData: false,
          contentType: false,
          success: function(response) {
            let newgp = build_group(groupname,response["path"]);
            document.querySelector("ul.contacts-list#chatContactTab").insertBefore(newgp,document.querySelector("ul.contacts-list#chatContactTab li.contacts-item#other_group"))
            click_group(newgp)
          },
          error: function(xhr, status, error) {
            console.log('Error:', error);
          }
        });
      }else{
        let newgp = build_group(groupname);
        document.querySelector("ul.contacts-list#chatContactTab").insertBefore(newgp,document.querySelector("ul.contacts-list#chatContactTab li.contacts-item#other_group"))
        click_group(newgp)
      }
      document.querySelector('input[type="file"]#profilePictureInput').value = ""
      document.querySelector("input#groupName").value = ""

    }
});
  
// the socket function that get called from the backend
socket.on("message",(data)=>{
  if(data){
    let messageDay = document.getElementsByClassName('message-day')
    messageDay = messageDay[messageDay.length - 1]; // get the first element with the class name
    const newMessageDiv = document.createElement('div');

    newMessageDiv.innerHTML = `<div class="message">
      <div class="message-wrapper">
        <div class="message-content"><span>${data.username?'<p>'+data.username.toUpperCase()+':</p>':""}${data.text}</span></div>
      </div>
      <div class="message-options">
        <div class="avatar avatar-sm"><img src="${data.image?data.image:"/static/media/avatar/6.png"}" alt=""></div>
        <span class="message-date">${data.time}</span>
      </div>
    </div>`;

    messageDay.appendChild(newMessageDiv); // append the new message to the messageDay element
    chatscrollDown()
  }
});

//send message button 
sendbtn = document.getElementById("sendbutton")
sendbtn.addEventListener("click",sendbtnfun)
function sendbtnfun() {
  textinput = document.getElementById("messageInput");
  if (textinput.value.trim().length > 0){
    let g_or_p = document.querySelector("div.chat-header div.media-body small.text-muted").innerHTML;
    g_or_p = g_or_p==="Group"?"Group":"private"
    if (g_or_p==="Group"){

      let grp_name = document.querySelector("div.chat-header h6.text-truncate").innerHTML;
      let imgs = document.querySelector("div.chat-header div.avatar img").src;
  
      socket.emit('message', {'room': grp_name,"username":c_username,"image":current_image_path,"text":textinput.value,"time":getCurrentTime()});
  
      messageDay = document.getElementsByClassName('message-day')
      messageDay = messageDay[messageDay.length - 1]; // get the first element with the class name
  
      const newMessage = document.createElement('div');
      newMessage.innerHTML = `<div class="message self">
        <div class="message-wrapper">
          <div class="message-content"><span>${textinput.value}</span></div>
        </div>
        <div class="message-options">
          <div class="avatar avatar-sm"><img src="${current_image_path?current_image_path:"/static/media/avatar/6.png"}" alt=""></div>
          <span class="message-date">${getCurrentTime()}</span>
        </div>
      </div>`;
    
      messageDay.appendChild(newMessage); // append the new message to the messageDay element
    }else{
      receiver_name = document.querySelector("div.chat-header h6.text-truncate").innerHTML;
      receiver_img = document.querySelector("div.chat-header div.avatar img").src;
      socket.emit('private_msgs', {'room': c_username+receiver_name,"sender":c_username,"receiver":receiver_name,"text":textinput.value,"time":getCurrentTime(),"image":receiver_img});
      messageDay = document.getElementsByClassName('message-day')
      messageDay = messageDay[messageDay.length - 1]; // get the first element with the class name
  
      const newMessage = document.createElement('div');
      newMessage.innerHTML = `<div class="message self">
        <div class="message-wrapper">
          <div class="message-content"><span>${textinput.value}</span></div>
        </div>
        <div class="message-options">
          <div class="avatar avatar-sm"><img src="${current_image_path?current_image_path:"/static/media/avatar/6.png"}" alt=""></div>
          <span class="message-date">${getCurrentTime()}</span>
        </div>
      </div>`;
    
      messageDay.appendChild(newMessage); // append the new message to the messageDay element

    }
    chatscrollDown()
    textinput.value = ""
  }
}

function chatscrollDown(){
  document.querySelector('.chat-finished').scrollIntoView({
    block: 'end', // "start" | "center" | "end" | "nearest",
    behavior: 'auto' //"auto"  | "instant" | "smooth",
  });
}
  
function getCurrentTime() {
  const now = new Date();
  const hours = now.getHours();
  const minutes = now.getMinutes();
  const ampm = hours >= 12 ? 'pm' : 'am';
  return `${hours>12?hours-12:hours}:${minutes}${ampm}`;
}


function build_group(group_n,filepath){
  newgroup = document.createElement('li');
  newgroup.setAttribute("class","contacts-item groups")
  newgroup.innerHTML = `<a class="contacts-link" href="javascript:group_chat_click();">
      <div class="avatar bg-success text-light">
          <span>
                  <!-- Default :: Inline SVG -->
                  ${!filepath?`<svg class="hw-24" fill="none" viewBox="0 0 24 24"
                      stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round"
                          stroke-width="2"
                          d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>`:
                  `<img class="injectable" src="/static/media_upload/`+filepath+`" alt="">`}
              </span>
      </div>
      <div class="contacts-content">
          <div class="contacts-info">
              <h6 class="chat-name">${group_n}</h6>
              <div class="chat-time"><span>${getCurrentTime()}</span></div>
          </div>
          <div class="contacts-texts">
              <div class="d-inline-flex align-items-center ml-1">
                  <!-- Default :: Inline SVG -->
                  <svg class="hw-16 text-muted" viewBox="0 0 20 20" fill="currentColor">
                          <path fill-rule="evenodd"
                              d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
                              clip-rule="evenodd" />
                      </svg>

                  <!-- Alternate :: External File link -->
                  <!-- <img class="injectable hw-16 text-muted" src="{{url_for('static', filename='media/heroicons/solid/lock-closed.svg')}}" alt=""> -->
              </div>
          </div>
      </div>
  </a>`
  return newgroup
}

//get the list of contacts and add onclick listener
document.querySelectorAll("ul.contacts-list#chatContactTab li").forEach(element => {
  if (element.getAttribute("class")==="contacts-item friends")
  click_friend(element);
  else if(element.getAttribute("class")==="contacts-item groups"){
    click_group(element)
  }
});

function mess(text,time,user_n,pathd){
  const newMessage = document.createElement('div');
  const now = new Date(time);
  const hours = now.getHours();
  const minutes = now.getMinutes();
  const ampm = hours >= 12 ? 'pm' : 'am';
  const tim = `${hours>12?hours-12:hours}:${minutes}${ampm}`;

  newMessage.innerHTML = `<div class="message">
    <div class="message-wrapper">
      <div class="message-content"><span>${user_n?'<p>'+user_n.toUpperCase()+':</p>':""}${text}</span></div>
    </div>
    <div class="message-options">
      <div class="avatar avatar-sm"><img src=${pathd?pathd:"/static/media/avatar/6.png"}  alt=""></div>
      <span class="message-date">${tim}</span>
    </div>
  </div>`;
  return newMessage;
}

function mess_self(text,time,pathd){
  const now = new Date(time);
  const hours = now.getHours();
  const minutes = now.getMinutes();
  const ampm = hours >= 12 ? 'pm' : 'am';
  const tim = `${hours>12?hours-12:hours}:${minutes}${ampm}`;

  const newMessage = document.createElement('div');
    newMessage.innerHTML = `<div class="message self">
      <div class="message-wrapper">
        <div class="message-content"><span>${text}</span></div>
      </div>
      <div class="message-options">
        <div class="avatar avatar-sm"><img src=${pathd?pathd:"/static/media/avatar/6.png"} alt=""></div>
        <span class="message-date">${tim}</span>
      </div>
    </div>`;
  return newMessage;
}


function svg_ico(pathd){
  const svgEl = document.createElement("div");
  svgEl.setAttribute("class","avatar bg-success text-light")
  svgEl.innerHTML = `<span>
          <!-- Default :: Inline SVG -->${!pathd?`
          <svg class="hw-24" fill="none" viewBox="0 0 24 24"
              stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round"
                  stroke-width="2"
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>

          <!-- Alternate :: External File link -->
          `:`<img class="injectable" src="`+pathd+`" alt=""> `}
      </span>`
      return svgEl
}

function private_chat_click(element) {
  var username = element.textContent;
  let new_user = document.createElement("li")
  new_user.setAttribute("class","contacts-item friends active")

  new_user.innerHTML = `<a class="contacts-link" href="#">
  <div class="avatar avatar-online">
  <img src="static/media/avatar/2.png" alt="">
  </div>
  <div class="contacts-content">
  <div class="contacts-info">
  <h6 class="chat-name text-truncate">${username}</h6>
  <div class="chat-time">Just now</div>
  </div>
  <div class="contacts-texts">
  <p class="text-truncate"></p>
  </div>
  </div>
  </a>`

  //remove other li active class start and set the clicked to active
  document.querySelectorAll("ul.contacts-list#chatContactTab li").forEach(elem=>{
    elem.classList.remove("active")
  });

  document.querySelector("ul.contacts-list#chatContactTab").insertBefore(new_user,document.querySelector("li.contacts-item#my_group"));
  click_friend(new_user);



  //empty the messages dive
  $("div.chat-content#messageBody div.container").empty();

  //leave the previous room
  let receiver = document.querySelector("div.chat-header h6.text-truncate").innerHTML;
  group = document.querySelector("div.chat-header div.media-body small.text-muted").innerHTML
  if(group === "Group")
  socket.emit('leave', {'room': document.querySelector("div.chat-header h6.text-truncate").innerHTML});
  else
  socket.emit('leave', {"sender":c_username,"receiver":receiver});

  //set the participant name start
  document.querySelector("div.chat-header h6.text-truncate").innerHTML = username
  
  //change from group chat icon to user icon
  let rep = document.querySelector("div.chat-header .media.chat-name .avatar")
  if (!rep.querySelector("img")){
    rep.innerHTML = '<img src="static/media/avatar/2.png" alt="">';
    rep.classList.add("avatar-online")
  }

  //setting the chat body to display
  if (document.querySelectorAll("main div.chats")[0].hasAttribute("style")){
    document.querySelectorAll("main div.chats")[0].removeAttribute("style")
    document.querySelectorAll("main div.chats")[1].setAttribute("style","display: none;")
  }
  
  //get from the backend the online status of the user
  $.get(`online_stat/${username}`,(data)=>{
    if (data["online"] === true){
      document.querySelector("div.chat-header div.media-body small.text-muted").innerHTML = "Online";
      document.querySelector("div.chat-body div.avatar").classList.remove("avatar-offline")
      document.querySelector("div.chat-body div.avatar").classList.add("avatar-online")
    }
    else{
      document.querySelector("div.chat-body div.avatar").classList.add("avatar-offline")
      document.querySelector("div.chat-body div.avatar").classList.remove("avatar-online")
      document.querySelector("div.chat-header div.media-body small.text-muted").innerHTML = "Offline"
    }
  });

    //set the message
    let newchat = document.createElement('div');
    newchat.setAttribute("class","message-day");
    newchat.innerHTML = '<div class="message-divider sticky-top pb-2" data-label="Today">&nbsp;</div>';
    
    //append the messages
    document.querySelector("div.chat-content#messageBody div.container").appendChild(newchat);
  

  //join the socket room
  socket.emit('private_join', {"sender":c_username,"receiver":username});  
}

document.querySelectorAll("div.container-xl div.card-footer.d-flex.justify-content-end").forEach((e,i)=>{
  e.addEventListener("click",()=>{
    if (i===0){
      let first_name = e.previousElementSibling.querySelector("[name=first_name]").value
      let last_name = e.previousElementSibling.querySelector("[name=last_name]").value
      let mobile_number = e.previousElementSibling.querySelector("[name=mobile_number]").value
      let email = e.previousElementSibling.querySelector("[name=email]").value
      let website = e.previousElementSibling.querySelector("[name=website]").value
      let address = e.previousElementSibling.querySelector("[name=address]").value
  
      $.post("user/", {
        "first_name":first_name,
        "last_name":last_name,
        "mobile_number":mobile_number,
        "email":email,
        "website":website,
        "Address":address
      },
        function (data, textStatus, jqXHR) {
          var myModal = new bootstrap.Modal(document.getElementById('savedsuccessfully'));
          myModal.show();
        }
        );
    }else if (i===1) {
      let facebook = e.previousElementSibling.querySelector("input#facebookId").value
      let twitterId = e.previousElementSibling.querySelector("input#twitterId").value
      let instagramId = e.previousElementSibling.querySelector("input#instagramId").value
      let linkedinId = e.previousElementSibling.querySelector("input#linkedinId").value
      
      $.post("user",{
        "Facebook":facebook,
        "Twitter":twitterId,
        "Instagram":instagramId,
        "Linkedin":linkedinId
      },(data)=>{
        var myModal = new bootstrap.Modal(document.getElementById('savedsuccessfully'));
        myModal.show();
      })


    }else if(i===2){
      let c_password = e.previousElementSibling.querySelector("input#current-password").value
      let n_password = e.previousElementSibling.querySelector("input#new-password").value
      let repeat_password = e.previousElementSibling.querySelector("input#repeat-password").value
      if (n_password!==repeat_password && !(n_password.length >= 2)){

      }else if (c_password.length>2 && n_password.length>2){
        $.post({
          url:"user/",
          data:{
            "c_password":c_password,
            "n_password":n_password
          },
          success:(data,textStatus,jqXHR)=>{
            console.log(data, textStatus, jqXHR)
            var myModal = new bootstrap.Modal(document.getElementById('changePassword'));
            myModal.show();
          },
          error:(data,textStatus,jqXHR)=>{
            console.log("i caught the error",data,textStatus,jqXHR)
          }
        });
      }
      
    }
  });
});


function click_friend(element) {
  element.addEventListener("click",()=>{

    //remove other li active class start and set the clicked to active
    document.querySelectorAll("ul.contacts-list#chatContactTab li").forEach(elem=>{
      elem.classList.remove("active")
    })
    element.classList.add("active")    
    
    //leave the previous room
    let receiver = document.querySelector("div.chat-header h6.text-truncate").innerHTML;
    group = document.querySelector("div.chat-header div.media-body small.text-muted").innerHTML
    if(group === "Group")
    socket.emit('leave', {'room': document.querySelector("div.chat-header h6.text-truncate").innerHTML});
    else
    socket.emit('leave', {"sender":c_username,"receiver":receiver});
    
    //set the participant name start
    let p_name = element.querySelector("h6.chat-name.text-truncate").innerHTML
    document.querySelector("div.chat-header h6.text-truncate").innerHTML = p_name

    //empty the messages dive
    $("div.chat-content#messageBody div.container").empty();


    //setting the chat body to display
    if (document.querySelectorAll("main div.chats")[0].hasAttribute("style")){
      document.querySelectorAll("main div.chats")[0].removeAttribute("style")
      document.querySelectorAll("main div.chats")[1].setAttribute("style","display: none;")
    }

    //change from group chat icon to user icon
    rep = document.querySelector("div.chat-header .media.chat-name .avatar")
    rep.innerHTML = `<img src="" alt="">`;
    
    
    //get from the backend the online status of the user
    $.get(`online_stat/${p_name}`,(data)=>{
      if (data["online"] === true){
        document.querySelector("div.chat-header div.media-body small.text-muted").innerHTML = "Online";
        document.querySelector("div.chat-body div.avatar").classList.remove("avatar-offline")
        document.querySelector("div.chat-body div.avatar").classList.add("avatar-online")
      }
      else{
        document.querySelector("div.chat-body div.avatar").classList.add("avatar-offline")
        document.querySelector("div.chat-body div.avatar").classList.remove("avatar-online")
        document.querySelector("div.chat-header div.media-body small.text-muted").innerHTML = "Offline"
      }
    });

    //join the socket room
    socket.emit('private_join', {"sender":c_username,"receiver":p_name});
    
    //set the message
    let newchat = document.createElement('div');
    newchat.setAttribute("class","message-day");
    newchat.innerHTML = '<div class="message-divider sticky-top pb-2" data-label="Older" style="display:none;">&nbsp;</div>'+'<div class="message-divider sticky-top pb-2" data-label="Yesterday" style="display:none;">&nbsp;</div>' + '<div class="message-divider sticky-top pb-2" data-label="Today">&nbsp;</div>';
    
    $.get(`dm/${p_name}`,(data)=>{
      if(data)
      data.forEach(e=>{
        if (e["username"]) {
          document.querySelector("div.hide-scrollbar.flex-fill h5.mb-1").innerHTML=e["username"]
          document.querySelector("div.hide-scrollbar p.text-muted span").innerHTML=e["address"]
          document.querySelector("div.chat-info-group-content p.mb-0#phone").innerHTML=e["phone"]
          document.querySelector("div.chat-info-group-content p.mb-0#email").innerHTML=e["email"]
          document.querySelector("div.chat-info-group-content p.mb-0#addr").innerHTML=e["address"]
          rep.querySelector("img").src = e["path"]?e["path"]:"static/media/avatar/2.png"
          e["path"]?document.querySelector("img.avatar-img#sideProfile").src=e["path"]:''
        }else{
          let tim = Date.parse(e["time"].slice(0,16)).toString()
          let today = Date.parse(Date().toString().slice(0,16)).toString()
          let yester_d = Date.parse(new Date(new Date().setDate(new Date().getDate()-1)).toString().slice(0,16)).toString()
          if (tim===today){
            if(e["sender"]===c_username)
            newchat.appendChild(mess_self(e["text"],e["time"],e["c_pathd"]))
            else
            newchat.appendChild(mess(e["text"],e["time"],"",e["o_pathd"]))
          }else if (tim===yester_d) {
            if (newchat.querySelector('[data-label="Yesterday"]').hasAttribute("style"))
              newchat.querySelector('[data-label="Yesterday"]').removeAttribute("style");
              
              
            if(e["sender"]===c_username)
              newchat.insertBefore(mess_self(e["text"],e["time"],e["c_pathd"]),newchat.querySelector('[data-label="Today"]'));
            else
              newchat.insertBefore(mess(e["text"],e["time"],"",e["o_pathd"]),newchat.querySelector('[data-label="Today"]'));
          }else{
            if (newchat.querySelector('[data-label="Older"]').hasAttribute("style"));
              newchat.querySelector('[data-label="Older"]').removeAttribute("style");

            if(e["sender"]===c_username)
            newchat.insertBefore(mess_self(e["text"],e["time"],e["c_pathd"]),newchat.querySelector('[data-label="Yesterday"]'))
          else
            newchat.insertBefore(mess(e["text"],e["time"],"",e["o_pathd"]),newchat.querySelector('[data-label="Yesterday"]'))
          }
        }
      });
      //scroldown
      chatscrollDown()
    });

    
    //append the messages
    document.querySelector("div.chat-content#messageBody div.container").appendChild(newchat);
  });
}


function click_group(element) {
  //add onclick listener to each group
  element.addEventListener("click",()=>{
  
    //remove the active class from other list
    document.querySelectorAll("ul.contacts-list#chatContactTab li").forEach(elem=>{
      elem.classList.remove("active");
    });
    //add the active class to the clicked item
    element.classList.add("active");

    //leave the former room
    receiver = document.querySelector("div.chat-header h6.text-truncate").innerHTML;
    group = document.querySelector("div.chat-header div.media-body small.text-muted").innerHTML
    if(group === "Group")
    socket.emit('leave', {'room': receiver});
    else
    socket.emit('leave', {"sender":c_username,"receiver":receiver});

    //change the chat header to the group name
    let g_name = element.querySelector("h6.chat-name").innerHTML;
    document.querySelector("div.chat-header h6.text-truncate").innerHTML = g_name;

    //change to the group icon
    rep = document.querySelector("div.chat-header .media.chat-name .avatar")
    if (rep.querySelector("img")){
      img = element.querySelector("img")
      rep.replaceChild(svg_ico(img?img.src:""),rep.querySelector("img"))
      rep.classList.remove("avatar-online")
      rep.classList.remove("avatar-offline")
    }

    //empty the div for messages
    $("div.chat-content#messageBody div.container").empty();

    //set the chat to display
    if (document.querySelectorAll("main div.chats")[0].hasAttribute("style")){
      document.querySelectorAll("main div.chats")[0].removeAttribute("style");
      document.querySelectorAll("main div.chats")[1].setAttribute("style","display: none;");
    }

    //create the message div
    newchat = document.createElement('div');
    newchat.setAttribute("class","message-day");
    newchat.innerHTML = '<div class="message-divider sticky-top pb-2" data-label="Older" style="display:none;">&nbsp;</div>'+'<div class="message-divider sticky-top pb-2" data-label="Yesterday" style="display:none;">&nbsp;</div>' + '<div class="message-divider sticky-top pb-2" data-label="Today">&nbsp;</div>';

    //change to group
    document.querySelector("div.chat-header div.media-body small.text-muted").innerHTML = "Group";

    //join the group
    socket.emit('join', {'room': g_name,"username":c_username});
    
    //get the group old messages
    $.get(`group/${g_name}`,(data)=>{
      if(data)
      data.forEach(e=>{
        let tim = Date.parse(e["time"].slice(0,16)).toString()
        let today = Date.parse(Date().toString().slice(0,16)).toString()
        let yester_d = Date.parse(new Date(new Date().setDate(new Date().getDate()-1)).toString().slice(0,16)).toString()
        if (tim===today){
          if(e["sender"]===c_username)
          newchat.appendChild(mess_self(e["text"],e["time"],current_image_path))
          else
          newchat.appendChild(mess(e["text"],e["time"],e["sender"],e["sender_image"]))
        }else if (tim===yester_d) {
          if (newchat.querySelector('[data-label="Yesterday"]').hasAttribute("style"))
            newchat.querySelector('[data-label="Yesterday"]').removeAttribute("style");
            
            
          if(e["sender"]===c_username)
            newchat.insertBefore(mess_self(e["text"],e["time"],current_image_path),newchat.querySelector('[data-label="Today"]'));
          else
            newchat.insertBefore(mess(e["text"],e["time"],e["sender"],e["sender_image"]),newchat.querySelector('[data-label="Today"]'));
        }else{
          if (newchat.querySelector('[data-label="Older"]').hasAttribute("style"));
            newchat.querySelector('[data-label="Older"]').removeAttribute("style");

          if(e["sender"]===c_username)
          newchat.insertBefore(mess_self(e["text"],e["time"],current_image_path),newchat.querySelector('[data-label="Yesterday"]'))
        else
          newchat.insertBefore(mess(e["text"],e["time"],e["sender"],e["sender_image"]),newchat.querySelector('[data-label="Yesterday"]'))
        }
      });

      //scrol down after displaying the old messages
      chatscrollDown()
    });

    //append the messages
    document.querySelector("div.chat-content#messageBody div.container").appendChild(newchat);
  });
}


function changeDP() {
  const dpInput = document.querySelector('input[type="file"]#changeDPinput');
  const file = dpInput.files[0];
  if (file) {
    const formData = new FormData();
    formData.append('file', file);
    
    $.ajax({
      url: 'upload/',
      type: 'POST',
      data: formData,
      processData: false,
      contentType: false,
      success: function(response) {
        document.querySelector("img.avatar-img#imgDP").src = response["path"]
        console.log('response:', response);
      },
      error: function(xhr, status, error) {
        console.log('Error:', error);
      }
    });
  }
  document.querySelector('input[type="file"]#changeDPinput').value = ""
}


