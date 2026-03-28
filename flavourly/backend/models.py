from flask_sqlalchemy import SQLAlchemy
from flask_login import UserMixin
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime

db = SQLAlchemy()


class User(UserMixin, db.Model):
    __tablename__ = 'users'
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(256), nullable=False)
    role = db.Column(db.String(20), default='user')  # 'user' or 'admin'
    avatar = db.Column(db.String(256), default='')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    reviews = db.relationship('Review', backref='user', lazy=True, cascade='all, delete-orphan')
    favourites = db.relationship('Favourite', backref='user', lazy=True, cascade='all, delete-orphan')
    cart_items = db.relationship('CartItem', backref='user', lazy=True, cascade='all, delete-orphan')
    orders = db.relationship('Order', backref='user', lazy=True, cascade='all, delete-orphan')

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

    def to_dict(self):
        return {
            'id': self.id,
            'username': self.username,
            'email': self.email,
            'role': self.role,
            'avatar': self.avatar,
            'created_at': self.created_at.isoformat()
        }


class Category(db.Model):
    __tablename__ = 'categories'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(60), unique=True, nullable=False)
    icon = db.Column(db.String(10), default='🍽️')

    recipes = db.relationship('Recipe', backref='category', lazy=True)

    def to_dict(self):
        return {'id': self.id, 'name': self.name, 'icon': self.icon}


class Recipe(db.Model):
    __tablename__ = 'recipes'
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(120), nullable=False)
    description = db.Column(db.Text, nullable=False)
    image_url = db.Column(db.String(256), default='')
    cook_time = db.Column(db.Integer, default=30)  # minutes
    servings = db.Column(db.Integer, default=2)
    category_id = db.Column(db.Integer, db.ForeignKey('categories.id'), nullable=False)
    is_veg = db.Column(db.Boolean, default=True)
    cuisine = db.Column(db.String(60), default='Indian')
    price = db.Column(db.Float, default=0.0)
    ingredients = db.Column(db.Text, default='')
    steps = db.Column(db.Text, default='')
    created_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    reviews = db.relationship('Review', backref='recipe', lazy=True, cascade='all, delete-orphan')
    favourites = db.relationship('Favourite', backref='recipe', lazy=True, cascade='all, delete-orphan')

    @property
    def avg_rating(self):
        if not self.reviews:
            return 0.0
        return round(sum(r.rating for r in self.reviews) / len(self.reviews), 1)

    @property
    def review_count(self):
        return len(self.reviews)

    def to_dict(self, include_details=False):
        d = {
            'id': self.id,
            'title': self.title,
            'description': self.description,
            'image_url': self.image_url,
            'cook_time': self.cook_time,
            'servings': self.servings,
            'category_id': self.category_id,
            'category_name': self.category.name if self.category else '',
            'category_icon': self.category.icon if self.category else '',
            'is_veg': self.is_veg,
            'cuisine': self.cuisine,
            'price': self.price,
            'avg_rating': self.avg_rating,
            'review_count': self.review_count,
            'created_at': self.created_at.isoformat()
        }
        if include_details:
            d['ingredients'] = self.ingredients
            d['steps'] = self.steps
            d['reviews'] = [r.to_dict() for r in self.reviews]
        return d


class Review(db.Model):
    __tablename__ = 'reviews'
    id = db.Column(db.Integer, primary_key=True)
    recipe_id = db.Column(db.Integer, db.ForeignKey('recipes.id'), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    rating = db.Column(db.Integer, nullable=False)  # 1-5
    comment = db.Column(db.Text, default='')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'recipe_id': self.recipe_id,
            'user_id': self.user_id,
            'username': self.user.username if self.user else 'Unknown',
            'rating': self.rating,
            'comment': self.comment,
            'created_at': self.created_at.isoformat()
        }


class Favourite(db.Model):
    __tablename__ = 'favourites'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    recipe_id = db.Column(db.Integer, db.ForeignKey('recipes.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'recipe_id': self.recipe_id,
            'recipe': self.recipe.to_dict() if self.recipe else None,
            'created_at': self.created_at.isoformat()
        }


class CartItem(db.Model):
    __tablename__ = 'cart_items'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    recipe_id = db.Column(db.Integer, db.ForeignKey('recipes.id'), nullable=False)
    quantity = db.Column(db.Integer, default=1)

    recipe = db.relationship('Recipe', backref='cart_items', lazy=True)

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'recipe_id': self.recipe_id,
            'quantity': self.quantity,
            'recipe': self.recipe.to_dict() if self.recipe else None
        }


class Order(db.Model):
    __tablename__ = 'orders'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    total = db.Column(db.Float, default=0.0)
    status = db.Column(db.String(30), default='pending')  # pending/confirmed/preparing/delivered/cancelled
    address = db.Column(db.Text, default='')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    items = db.relationship('OrderItem', backref='order', lazy=True, cascade='all, delete-orphan')

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'username': self.user.username if self.user else '',
            'total': self.total,
            'status': self.status,
            'address': self.address,
            'items': [i.to_dict() for i in self.items],
            'created_at': self.created_at.isoformat()
        }


class OrderItem(db.Model):
    __tablename__ = 'order_items'
    id = db.Column(db.Integer, primary_key=True)
    order_id = db.Column(db.Integer, db.ForeignKey('orders.id'), nullable=False)
    recipe_id = db.Column(db.Integer, db.ForeignKey('recipes.id'), nullable=False)
    quantity = db.Column(db.Integer, default=1)
    price = db.Column(db.Float, default=0.0)

    recipe = db.relationship('Recipe', backref='order_items', lazy=True)

    def to_dict(self):
        return {
            'id': self.id,
            'order_id': self.order_id,
            'recipe_id': self.recipe_id,
            'recipe_title': self.recipe.title if self.recipe else '',
            'recipe_image': self.recipe.image_url if self.recipe else '',
            'quantity': self.quantity,
            'price': self.price
        }
