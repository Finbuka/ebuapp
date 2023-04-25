#!/usr/bin/env python3
"""
Declare a SQLAlchemy model named 'User' corresponding to a
database table named "users"
"""

from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, UniqueConstraint
from sqlalchemy.orm import relationship
import datetime

Base = declarative_base()


class User(Base):
    """
    Definition of class User
    """

    __tablename__ = "users"

    id = Column(Integer, primary_key=True)
    username = Column(String(250), nullable=False,unique=True)
    email = Column(String(250), nullable=False, unique=True)
    hashed_password = Column(String(250), nullable=False)
    date_joined = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)
    session_id = Column(String(250), nullable=True)
    reset_token = Column(String(250), nullable=True)
    
    last_seen = Column(DateTime,nullable=True)

    image_name = Column(String(100),nullable=True)
    image_path = Column(String(100),nullable=True)

    first_name = Column(String(250), nullable=True)
    last_name = Column(String(250), nullable=True)

    mobile_number = Column(String(250), nullable=True)
    website = Column(String(250), nullable=True)
    Address = Column(String(250), nullable=True)
    
    Linkedin = Column(String(250), nullable=True)
    Facebook = Column(String(250), nullable=True)
    Twitter = Column(String(250), nullable=True)
    Instagram = Column(String(250), nullable=True)

    # One-to-many relationship between users and messages they sent
    sent_messages = relationship('Message', backref='sender', foreign_keys='Message.sender_id',viewonly=True)

    # Many-to-many relationship between users and group chats
    group_chats = relationship('GroupChat', secondary='user_group_chat_association_table', back_populates='users')

    # Unique constraint on id and username
    __table_args__ = (UniqueConstraint('id', 'username'),)



class GroupChat(Base):
    __tablename__ = 'group_chats'
    
    id = Column(Integer, primary_key=True)
    name = Column(String(50), nullable=False)

    image_name = Column(String(100),nullable=True)
    image_path = Column(String(100),nullable=True)

    created_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)
    
    # Many-to-many relationship between users and group chats
    users = relationship('User', secondary='user_group_chat_association_table', back_populates='group_chats')
    
    # One-to-many relationship between group chats and messages sent to them
    messages = relationship('Message', backref='group_chat', foreign_keys='Message.group_chat_id')

    

class UserGroupChatAssociation(Base):
    __tablename__ = 'user_group_chat_association_table'
    
    user_id = Column(Integer, ForeignKey('users.id'), primary_key=True)
    group_chat_id = Column(Integer, ForeignKey('group_chats.id'), primary_key=True)

class Message(Base):
    __tablename__ = 'messages'
    
    id = Column(Integer, primary_key=True)
    sender_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    receiver_id = Column(Integer, ForeignKey('users.id'), nullable=True)
    group_chat_id = Column(Integer, ForeignKey('group_chats.id'), nullable=True)
    text = Column(String(500), nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)
    
    # One-to-many relationship between users and messages they sent
    msg_sender = relationship('User', foreign_keys=[sender_id])
    msg_receiver = relationship('User', foreign_keys=[receiver_id])
    