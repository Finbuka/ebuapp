from sqlalchemy import create_engine, Column, Integer, String, ForeignKey, DateTime
from sqlalchemy.orm import relationship, backref
from sqlalchemy.ext.declarative import declarative_base
import datetime

Base = declarative_base()

class User(Base):
    __tablename__ = 'users'
    
    id = Column(Integer, primary_key=True)
    username = Column(String(50), nullable=False, unique=True)
    password = Column(String(50), nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)
    
    # One-to-many relationship between users and messages they sent
    sent_messages = relationship('Message', backref='sender', foreign_keys='Message.sender_id')
    
    # Many-to-many relationship between users and group chats
    group_chats = relationship('GroupChat', secondary='user_group_chat_association_table', back_populates='users')
    

class GroupChat(Base):
    __tablename__ = 'group_chats'
    
    id = Column(Integer, primary_key=True)
    name = Column(String(50), nullable=False)
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
    private_chat_id = Column(Integer, ForeignKey('private_chats.id'), nullable=True)
    text = Column(String(500), nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)
    
    # One-to-many relationship between users and messages they sent
    sender = relationship('User', foreign_keys=[sender_id])
    receiver = relationship('User', foreign_keys=[receiver_id])
    
    # Many-to-one relationship between messages and their private chat
    private_chat = relationship('PrivateChat', back_populates='messages')


class PrivateChat(Base):
    __tablename__ = 'private_chats'
    
    id = Column(Integer, primary_key=True)
    user1_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    user2_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)
    
    # One-to-many relationship between private chats and messages sent to them
    messages = relationship('Message', backref='private_chat', foreign_keys='Message.private_chat_id')

