#!/usr/bin/env python3
"""
Definition of user validation module function
"""
from typing import List
from .db import DB
from bcrypt import hashpw, gensalt, checkpw
from .user import User

from sqlalchemy.orm.exc import NoResultFound
import uuid


def _hash_password(password: str) -> bytes:
    """The hash_password function"""
    password_bytes = password.encode("utf-8")
    hashed_password = hashpw(password_bytes, gensalt())
    return hashed_password


def _generate_uuid() -> str:
    """The Generate UUID function"""
    return str(uuid.uuid4())


class Auth:
    """Auth class to interact with the authentication database."""

    def __init__(self):
        self._db = DB()

    def require_auth(self, path: str, excluded_paths: List[str]) -> bool:
        if path is None:
            return True    
        elif excluded_paths is None or len(excluded_paths) == 0:
            return True
        elif path == "/":
            return True
        elif path in excluded_paths:
            return False
        else:
            for i in excluded_paths:
                if path.startswith(i):
                    return False
                if i.startswith(path):
                    return False
        return True
    
    def current_user(self, request=None):
        if request:
            session_id = request.cookies.get("session_id")
            if session_id:
                return self.get_user_from_session_id(session_id)

    def register_user(self, username: str, email: str, password: str) -> User:
        """The register_user method"""
        try:
            self._db.find_user_by(email=email)
            raise ValueError("User <{}> already exists".format(email))
        except NoResultFound as e:
            password = _hash_password(password)
            return self._db.add_user(username, email, password)

    def valid_login(self, email: str, password: str) -> bool:
        """The valid_login function"""
        try:
            user = self._db.find_user_by(email=email)
            password_bytes = password.encode("utf-8")
            hashed_password_bytes = user.hashed_password
            return checkpw(password_bytes, hashed_password_bytes)
        except Exception:
            return False

    def create_session(self, email: str) -> str:
        """The Create Session function"""
        try:
            user = self._db.find_user_by(email=email)
            session_id = _generate_uuid()
            self._db.update_user(user.id, session_id=session_id)
            return session_id
        except NoResultFound:
            return None

    def get_user_from_session_id(self, session_id: str) -> User:
        """The Get User from Session Id method"""
        try:
            user = self._db.find_user_by(session_id=session_id)
            return user
        except Exception:
            return None

    def destroy_session(self, user_id: str) -> None:
        """The Destroy Session method"""
        try:
            self._db.update_user(user_id, session_id=None)
            return None
        except Exception:
            return None

    def get_reset_password_token(self, email: str) -> str:
        """The GET Reset Password Token method"""
        try:
            user = self._db.find_user_by(email=email)
            reset_token = _generate_uuid()
            self._db.update_user(user.id, reset_token=reset_token)
            return reset_token
        except NoResultFound:
            raise ValueError

    def update_password(self, reset_token: str, password: str) -> None:
        """
        Updates a user's password
        Args:
            reset_token (str): reset_token issued to reset the password
            password (str): user's new password
        Return:
            None
        """
        try:
            user = self._db.find_user_by(reset_token=reset_token)
            hashed_password = _hash_password(password).decode("utf-8")
            self._db.update_user(
                user.id, hashed_password=hashed_password, reset_token=None
            )
            return None
        except NoResultFound:
            raise ValueError
        
    def db_session(self):
        """
        return the db session
        """
        return self._db._session
    
    def update_user(self,user_id, kwargs):
        self._db.update_user(user_id,**kwargs)

    def change_password(self, user_obj, cur_passwrd, new_passwrd):
        if checkpw(cur_passwrd.encode("utf-8"), user_obj.hashed_password):
            password = _hash_password(new_passwrd)
            self._db.update_user(user_obj.id,hashed_password=password)
            return True
        return False