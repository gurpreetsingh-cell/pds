from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import text
import bcrypt
import jwt
import os
from datetime import datetime, timedelta, timezone
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__, static_folder='.')
CORS(app)

# Database configuration
base_dir = os.path.abspath(os.path.dirname(__file__))
database_url = os.getenv('DATABASE_URL', 'sqlite:///instance/escalation.db')

if database_url.startswith('sqlite:///'):
    sqlite_path = database_url[len('sqlite:///'):]
    if sqlite_path != ':memory:' and not os.path.isabs(sqlite_path):
        sqlite_path = os.path.join(base_dir, sqlite_path)
        sqlite_path = sqlite_path.replace('\\', '/')
        database_url = f"sqlite:///{sqlite_path}"

    sqlite_dir = os.path.dirname(sqlite_path)
    if sqlite_dir and not os.path.exists(sqlite_dir):
        os.makedirs(sqlite_dir, exist_ok=True)

app.config['SQLALCHEMY_DATABASE_URI'] = database_url
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'your-secret-key-here')

db = SQLAlchemy(app)

from sqlalchemy import inspect

def ensure_user_role_column():
    with app.app_context():
        inspector = inspect(db.engine)
        if 'user' not in inspector.get_table_names():
            return
        columns = [col['name'] for col in inspector.get_columns('user')]
        if 'role' not in columns:
            if db.engine.dialect.name == 'sqlite':
                db.session.execute(text("ALTER TABLE user ADD COLUMN role VARCHAR(20) NOT NULL DEFAULT 'user'"))
            else:
                db.session.execute(text('ALTER TABLE "user" ADD COLUMN role VARCHAR(20) NOT NULL DEFAULT \'user\''))
            db.session.commit()

ensure_user_role_column()

# Models
class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    password_hash = db.Column(db.String(128), nullable=False)
    role = db.Column(db.String(20), nullable=False, default='user')
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

class Escalation(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    tracking_id = db.Column(db.String(50), nullable=False)
    customer_name = db.Column(db.String(100), nullable=False)
    phone = db.Column(db.String(20))
    email = db.Column(db.String(100))
    issue_type = db.Column(db.String(50), nullable=False)
    description = db.Column(db.Text)
    status = db.Column(db.String(20), default='open')
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)

def get_token_from_request():
    """Extract JWT token from Authorization header"""
    auth_header = request.headers.get('Authorization', '')
    if auth_header.startswith('Bearer '):
        return auth_header[7:]
    return None

def ensure_admin_user():
    with app.app_context():
        db.create_all()
        admin = User.query.filter_by(username='admin').first()
        if not admin:
            password_hash = bcrypt.hashpw('admin123'.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
            admin = User(username='admin', password_hash=password_hash, role='admin')
            db.session.add(admin)
            db.session.commit()
        else:
            if admin.role != 'admin':
                admin.role = 'admin'
                db.session.commit()
        User.query.filter(User.username != 'admin').update({'role': 'user'}, synchronize_session=False)
        db.session.commit()

ensure_admin_user()

# ============ API ROUTES ============

@app.route('/api/health', methods=['GET'])
def health():
    """Health check endpoint"""
    try:
        db.session.execute(text('SELECT 1'))
        return jsonify({'status': 'ok', 'database': 'connected'}), 200
    except Exception as e:
        return jsonify({'status': 'error', 'database': 'disconnected', 'error': str(e)}), 500

@app.route('/api/login', methods=['POST'])
def login():
    """User login endpoint"""
    try:
        data = request.get_json(force=True)
        username = data.get('username', '').strip()
        password = data.get('password', '')
        
        if not username or not password:
            return jsonify({'error': 'Username and password required'}), 400

        user = User.query.filter_by(username=username).first()
        if user and bcrypt.checkpw(password.encode('utf-8'), user.password_hash.encode('utf-8')):
            token = jwt.encode({
                'user_id': user.id,
                'username': user.username,
                'role': user.role,
                'exp': datetime.utcnow() + timedelta(days=7)
            }, app.config['SECRET_KEY'], algorithm='HS256')
            
            if isinstance(token, bytes):
                token = token.decode('utf-8')
            
            return jsonify({
                'token': str(token),
                'user': {'id': user.id, 'username': user.username, 'role': user.role or 'user'}
            }), 200
        
        return jsonify({'error': 'Invalid credentials'}), 401
    except Exception as e:
        return jsonify({'error': f'Server error: {str(e)}'}), 500

@app.route('/api/register', methods=['POST'])
def register():
    """User registration endpoint"""
    try:
        data = request.get_json(force=True)
        username = data.get('username', '').strip()
        password = data.get('password', '')

        if not username or not password:
            return jsonify({'error': 'Username and password required'}), 400

        if User.query.filter_by(username=username).first():
            return jsonify({'error': 'Username already exists'}), 400

        password_hash = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
        user = User(username=username, password_hash=password_hash, role='user')
        db.session.add(user)
        db.session.commit()

        return jsonify({'message': 'User created successfully'}), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Server error: {str(e)}'}), 500

@app.route('/api/escalations', methods=['GET'])
def get_escalations():
    """Get all escalations for authenticated users"""
    token = get_token_from_request()
    if not token:
        return jsonify({'error': 'No token provided'}), 401

    try:
        jwt.decode(token, app.config['SECRET_KEY'], algorithms=['HS256'])
    except:
        return jsonify({'error': 'Invalid token'}), 401

    try:
        escalations = Escalation.query.order_by(Escalation.created_at.desc()).all()
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
            'updated_at': e.updated_at.isoformat(),
            'user_id': e.user_id
        } for e in escalations]), 200
    except Exception as e:
        return jsonify({'error': f'Server error: {str(e)}'}), 500

@app.route('/api/escalations', methods=['POST'])
def create_escalation():
    """Create new escalation"""
    token = get_token_from_request()
    if not token:
        return jsonify({'error': 'No token provided'}), 401

    try:
        payload = jwt.decode(token, app.config['SECRET_KEY'], algorithms=['HS256'])
        user_id = payload['user_id']
    except:
        return jsonify({'error': 'Invalid token'}), 401

    try:
        data = request.get_json(force=True)
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
        }), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Server error: {str(e)}'}), 500

@app.route('/api/escalations/<int:id>', methods=['PUT'])
def update_escalation(id):
    """Update escalation"""
    token = get_token_from_request()
    if not token:
        return jsonify({'error': 'No token provided'}), 401

    try:
        payload = jwt.decode(token, app.config['SECRET_KEY'], algorithms=['HS256'])
        user_id = payload['user_id']
    except:
        return jsonify({'error': 'Invalid token'}), 401

    escalation = Escalation.query.filter_by(id=id).first()
    if not escalation:
        return jsonify({'error': 'Escalation not found'}), 404

    try:
        data = request.get_json(force=True)
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
        }), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Server error: {str(e)}'}), 500

@app.route('/api/escalations/<int:id>', methods=['DELETE'])
def delete_escalation(id):
    """Delete escalation"""
    token = get_token_from_request()
    if not token:
        return jsonify({'error': 'No token provided'}), 401

    try:
        payload = jwt.decode(token, app.config['SECRET_KEY'], algorithms=['HS256'])
        user_id = payload['user_id']
    except:
        return jsonify({'error': 'Invalid token'}), 401

    escalation = Escalation.query.filter_by(id=id).first()
    if not escalation:
        return jsonify({'error': 'Escalation not found'}), 404

    try:
        db.session.delete(escalation)
        db.session.commit()
        return jsonify({'message': 'Escalation deleted'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Server error: {str(e)}'}), 500

# ============ ERROR HANDLERS ============

@app.errorhandler(404)
def not_found(error):
    """Handle 404 errors"""
    return jsonify({'error': 'Endpoint not found'}), 404

@app.errorhandler(405)
def method_not_allowed(error):
    """Handle 405 errors"""
    return jsonify({'error': 'Method not allowed'}), 405

@app.errorhandler(500)
def internal_error(error):
    """Handle 500 errors"""
    db.session.rollback()
    return jsonify({'error': 'Internal server error'}), 500

# ============ STATIC FILE SERVING ============

@app.route('/')
def index():
    """Serve main HTML file"""
    try:
        return send_from_directory('.', 'index.html')
    except Exception as e:
        return jsonify({'error': 'Cannot serve index.html'}), 500

# ============ INITIALIZATION ============

if __name__ == '__main__':
    with app.app_context():
        try:
            db.create_all()
            print("✅ Database tables created")
            
            # Create admin user if doesn't exist
            try:
                if not User.query.filter_by(username='admin').first():
                    password_hash = bcrypt.hashpw('admin123'.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
                    admin = User(username='admin', password_hash=password_hash)
                    db.session.add(admin)
                    db.session.commit()
                    print("✅ Admin user created (admin/admin123)")
                else:
                    print("✅ Admin user already exists")
            except Exception as e:
                print(f"⚠️  Could not create admin user: {e}")
                db.session.rollback()
        except Exception as e:
            print(f"❌ Database error: {e}")
    
    port = int(os.getenv('PORT', 5000))
    debug_mode = os.getenv('FLASK_ENV') == 'development'
    print(f"🚀 Starting server on 0.0.0.0:{port} (debug={debug_mode})")
    app.run(host='0.0.0.0', port=port, debug=debug_mode)
