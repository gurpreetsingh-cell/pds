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

# Helper function to extract token from Authorization header
def get_token_from_request():
    auth_header = request.headers.get('Authorization', '')
    if auth_header.startswith('Bearer '):
        return auth_header[7:]  # Remove 'Bearer ' prefix
    return auth_header if auth_header else None

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
@app.route('/health', methods=['GET'])
def health():
    try:
        db.session.execute('SELECT 1')
        return jsonify({'status': 'ok', 'database': 'connected'})
    except:
        return jsonify({'status': 'error', 'database': 'disconnected'}), 500

@app.route('/')
def index():
    return send_from_directory('.', 'index.html')

@app.route('/<path:path>')
def static_files(path):
    return send_from_directory('.', path)

@app.route('/api/login', methods=['POST'])
def login():
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No JSON data provided'}), 400
        
        username = data.get('username', '').strip()
        password = data.get('password', '')
        
        if not username or not password:
            return jsonify({'error': 'Username and password required'}), 400

        user = User.query.filter_by(username=username).first()
        if user and bcrypt.checkpw(password.encode('utf-8'), user.password_hash.encode('utf-8')):
            token = jwt.encode({
                'user_id': user.id,
                'exp': datetime.utcnow() + timedelta(days=7)
            }, app.config['SECRET_KEY'], algorithm='HS256')
            # Ensure token is string type
            if isinstance(token, bytes):
                token = token.decode('utf-8')
            return jsonify({'token': str(token), 'user': {'id': user.id, 'username': user.username}})
        return jsonify({'error': 'Invalid credentials'}), 401
    except Exception as e:
        return jsonify({'error': f'Server error: {str(e)}'}), 500

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
    token = get_token_from_request()
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
    token = get_token_from_request()
    if not token:
        return jsonify({'error': 'No token provided'}), 401

    try:
        payload = jwt.decode(token, app.config['SECRET_KEY'], algorithms=['HS256'])
        user_id = payload['user_id']
    except:
        return jsonify({'error': 'Invalid token'}), 401

    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No JSON data provided'}), 400
        
        escalation = Escalation(
            tracking_id=data.get('tracking_id', ''),
            customer_name=data.get('customer_name', ''),
            phone=data.get('phone'),
            email=data.get('email'),
            issue_type=data.get('issue_type', ''),
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
    except Exception as e:
        return jsonify({'error': f'Server error: {str(e)}'}), 500

@app.route('/api/escalations/<int:id>', methods=['PUT'])
def update_escalation(id):
    token = get_token_from_request()
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

    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No JSON data provided'}), 400
        
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
    except Exception as e:
        return jsonify({'error': f'Server error: {str(e)}'}), 500

@app.route('/api/escalations/<int:id>', methods=['DELETE'])
def delete_escalation(id):
    token = get_token_from_request()
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

    try:
        db.session.delete(escalation)
        db.session.commit()
        return jsonify({'message': 'Escalation deleted'})
    except Exception as e:
        return jsonify({'error': f'Server error: {str(e)}'}), 500

# Global Error Handlers
@app.errorhandler(404)
def not_found(error):
    return jsonify({'error': 'Endpoint not found'}), 404

@app.errorhandler(405)
def method_not_allowed(error):
    return jsonify({'error': 'Method not allowed'}), 405

@app.errorhandler(500)
def internal_error(error):
    db.session.rollback()
    return jsonify({'error': 'Internal server error'}), 500

if __name__ == '__main__':
    with app.app_context():
        db.create_all()
        # Create admin user if doesn't exist
        if not User.query.filter_by(username='admin').first():
            password_hash = bcrypt.hashpw('admin123'.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
            admin = User(username='admin', password_hash=password_hash)
            db.session.add(admin)
            db.session.commit()
            print("✅ Admin user created")
    port = int(os.getenv('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=False)