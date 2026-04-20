from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
import bcrypt
import jwt
import os
from datetime import datetime, timedelta
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__, static_folder='.')
CORS(app)

# Database configuration
app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv('DATABASE_URL', 'sqlite:///escalation.db')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'your-secret-key-here')

db = SQLAlchemy(app)

# Models
class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    password_hash = db.Column(db.String(128), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class Escalation(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    tracking_id = db.Column(db.String(50), nullable=False)
    customer_name = db.Column(db.String(100), nullable=False)
    phone = db.Column(db.String(20))
    email = db.Column(db.String(100))
    issue_type = db.Column(db.String(50), nullable=False)
    description = db.Column(db.Text)
    status = db.Column(db.String(20), default='open')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)

# Routes
@app.route('/')
def index():
    return send_from_directory('.', 'index.html')

@app.route('/<path:path>')
def static_files(path):
    return send_from_directory('.', path)

@app.route('/api/login', methods=['POST'])
def login():
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')

    user = User.query.filter_by(username=username).first()
    if user and bcrypt.checkpw(password.encode('utf-8'), user.password_hash.encode('utf-8')):
        token = jwt.encode({
            'user_id': user.id,
            'exp': datetime.utcnow() + timedelta(days=7)
        }, app.config['SECRET_KEY'], algorithm='HS256')
        return jsonify({'token': token, 'user': {'id': user.id, 'username': user.username}})
    return jsonify({'error': 'Invalid credentials'}), 401

@app.route('/api/register', methods=['POST'])
def register():
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')

    if User.query.filter_by(username=username).first():
        return jsonify({'error': 'Username already exists'}), 400

    password_hash = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    user = User(username=username, password_hash=password_hash)
    db.session.add(user)
    db.session.commit()

    return jsonify({'message': 'User created successfully'})

@app.route('/api/escalations', methods=['GET'])
def get_escalations():
    token = request.headers.get('Authorization')
    if not token:
        return jsonify({'error': 'No token provided'}), 401

    try:
        payload = jwt.decode(token, app.config['SECRET_KEY'], algorithms=['HS256'])
        user_id = payload['user_id']
    except:
        return jsonify({'error': 'Invalid token'}), 401

    escalations = Escalation.query.filter_by(user_id=user_id).all()
    return jsonify([{
        'id': e.id,
        'tracking_id': e.tracking_id,
        'customer_name': e.customer_name,
        'phone': e.phone,
        'email': e.email,
        'issue_type': e.issue_type,
        'description': e.description,
        'status': e.status,
        'created_at': e.created_at.isoformat(),
        'updated_at': e.updated_at.isoformat()
    } for e in escalations])

@app.route('/api/escalations', methods=['POST'])
def create_escalation():
    token = request.headers.get('Authorization')
    if not token:
        return jsonify({'error': 'No token provided'}), 401

    try:
        payload = jwt.decode(token, app.config['SECRET_KEY'], algorithms=['HS256'])
        user_id = payload['user_id']
    except:
        return jsonify({'error': 'Invalid token'}), 401

    data = request.get_json()
    escalation = Escalation(
        tracking_id=data['tracking_id'],
        customer_name=data['customer_name'],
        phone=data.get('phone'),
        email=data.get('email'),
        issue_type=data['issue_type'],
        description=data.get('description'),
        user_id=user_id
    )
    db.session.add(escalation)
    db.session.commit()

    return jsonify({
        'id': escalation.id,
        'tracking_id': escalation.tracking_id,
        'customer_name': escalation.customer_name,
        'phone': escalation.phone,
        'email': escalation.email,
        'issue_type': escalation.issue_type,
        'description': escalation.description,
        'status': escalation.status,
        'created_at': escalation.created_at.isoformat(),
        'updated_at': escalation.updated_at.isoformat()
    })

@app.route('/api/escalations/<int:id>', methods=['PUT'])
def update_escalation(id):
    token = request.headers.get('Authorization')
    if not token:
        return jsonify({'error': 'No token provided'}), 401

    try:
        payload = jwt.decode(token, app.config['SECRET_KEY'], algorithms=['HS256'])
        user_id = payload['user_id']
    except:
        return jsonify({'error': 'Invalid token'}), 401

    escalation = Escalation.query.filter_by(id=id, user_id=user_id).first()
    if not escalation:
        return jsonify({'error': 'Escalation not found'}), 404

    data = request.get_json()
    escalation.tracking_id = data.get('tracking_id', escalation.tracking_id)
    escalation.customer_name = data.get('customer_name', escalation.customer_name)
    escalation.phone = data.get('phone', escalation.phone)
    escalation.email = data.get('email', escalation.email)
    escalation.issue_type = data.get('issue_type', escalation.issue_type)
    escalation.description = data.get('description', escalation.description)
    escalation.status = data.get('status', escalation.status)
    db.session.commit()

    return jsonify({
        'id': escalation.id,
        'tracking_id': escalation.tracking_id,
        'customer_name': escalation.customer_name,
        'phone': escalation.phone,
        'email': escalation.email,
        'issue_type': escalation.issue_type,
        'description': escalation.description,
        'status': escalation.status,
        'created_at': escalation.created_at.isoformat(),
        'updated_at': escalation.updated_at.isoformat()
    })

@app.route('/api/escalations/<int:id>', methods=['DELETE'])
def delete_escalation(id):
    token = request.headers.get('Authorization')
    if not token:
        return jsonify({'error': 'No token provided'}), 401

    try:
        payload = jwt.decode(token, app.config['SECRET_KEY'], algorithms=['HS256'])
        user_id = payload['user_id']
    except:
        return jsonify({'error': 'Invalid token'}), 401

    escalation = Escalation.query.filter_by(id=id, user_id=user_id).first()
    if not escalation:
        return jsonify({'error': 'Escalation not found'}), 404

    db.session.delete(escalation)
    db.session.commit()

    return jsonify({'message': 'Escalation deleted'})

if __name__ == '__main__':
    with app.app_context():
        db.create_all()
    app.run(debug=True)