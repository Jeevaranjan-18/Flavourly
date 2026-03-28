from flask import Flask, request, jsonify, send_from_directory
from flask_login import LoginManager, login_user, logout_user, login_required, current_user
from flask_cors import CORS
from models import db, User, Category, Recipe, Review, Favourite, CartItem, Order, OrderItem
import os

def create_app():
    app = Flask(__name__, static_folder='../frontend', static_url_path='')
    app.config['SECRET_KEY'] = 'foodapp-secret-key-2024'
    app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///foodapp.db'
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

    db.init_app(app)
    CORS(app, supports_credentials=True)

    login_manager = LoginManager()
    login_manager.init_app(app)

    @login_manager.user_loader
    def load_user(user_id):
        return User.query.get(int(user_id))

    # ── serve frontend ──────────────────────────────────────────────────────────
    @app.route('/')
    def index():
        return send_from_directory(app.static_folder, 'index.html')

    # ── AUTH ────────────────────────────────────────────────────────────────────
    @app.route('/api/auth/register', methods=['POST'])
    def register():
        data = request.get_json()
        if not data or not all(k in data for k in ('username', 'email', 'password')):
            return jsonify({'error': 'Missing fields'}), 400
        if User.query.filter_by(email=data['email']).first():
            return jsonify({'error': 'Email already registered'}), 409
        if User.query.filter_by(username=data['username']).first():
            return jsonify({'error': 'Username already taken'}), 409
        user = User(username=data['username'], email=data['email'])
        user.set_password(data['password'])
        db.session.add(user)
        db.session.commit()
        login_user(user)
        return jsonify({'message': 'Registered successfully', 'user': user.to_dict()}), 201

    @app.route('/api/auth/login', methods=['POST'])
    def login():
        data = request.get_json()
        if not data or not all(k in data for k in ('email', 'password')):
            return jsonify({'error': 'Missing fields'}), 400
        user = User.query.filter_by(email=data['email']).first()
        if not user or not user.check_password(data['password']):
            return jsonify({'error': 'Invalid credentials'}), 401
        login_user(user, remember=True)
        return jsonify({'message': 'Logged in', 'user': user.to_dict()})

    @app.route('/api/auth/logout', methods=['POST'])
    @login_required
    def logout():
        logout_user()
        return jsonify({'message': 'Logged out'})

    @app.route('/api/auth/me', methods=['GET'])
    def me():
        if current_user.is_authenticated:
            return jsonify({'user': current_user.to_dict()})
        return jsonify({'user': None})

    # ── CATEGORIES ──────────────────────────────────────────────────────────────
    @app.route('/api/categories', methods=['GET'])
    def get_categories():
        cats = Category.query.all()
        return jsonify([c.to_dict() for c in cats])

    # ── RECIPES ─────────────────────────────────────────────────────────────────
    @app.route('/api/recipes', methods=['GET'])
    def get_recipes():
        q = request.args.get('q', '')
        category_id = request.args.get('category_id', type=int)
        is_veg = request.args.get('is_veg')
        cuisine = request.args.get('cuisine', '')
        sort = request.args.get('sort', 'newest')  # newest | rating | price_asc | price_desc

        query = Recipe.query
        if q:
            query = query.filter(Recipe.title.ilike(f'%{q}%'))
        if category_id:
            query = query.filter_by(category_id=category_id)
        if is_veg is not None and is_veg != '':
            query = query.filter_by(is_veg=(is_veg.lower() == 'true'))
        if cuisine:
            query = query.filter(Recipe.cuisine.ilike(f'%{cuisine}%'))

        if sort == 'price_asc':
            query = query.order_by(Recipe.price.asc())
        elif sort == 'price_desc':
            query = query.order_by(Recipe.price.desc())
        else:
            query = query.order_by(Recipe.created_at.desc())

        recipes = query.all()
        return jsonify([r.to_dict() for r in recipes])

    @app.route('/api/recipes/<int:recipe_id>', methods=['GET'])
    def get_recipe(recipe_id):
        recipe = Recipe.query.get_or_404(recipe_id)
        return jsonify(recipe.to_dict(include_details=True))

    @app.route('/api/recipes', methods=['POST'])
    @login_required
    def create_recipe():
        if current_user.role != 'admin':
            return jsonify({'error': 'Admin only'}), 403
        data = request.get_json()
        recipe = Recipe(
            title=data['title'],
            description=data.get('description', ''),
            image_url=data.get('image_url', ''),
            cook_time=data.get('cook_time', 30),
            servings=data.get('servings', 2),
            category_id=data['category_id'],
            is_veg=data.get('is_veg', True),
            cuisine=data.get('cuisine', 'Indian'),
            price=data.get('price', 0.0),
            ingredients=data.get('ingredients', ''),
            steps=data.get('steps', ''),
            created_by=current_user.id
        )
        db.session.add(recipe)
        db.session.commit()
        return jsonify(recipe.to_dict()), 201

    @app.route('/api/recipes/<int:recipe_id>', methods=['PUT'])
    @login_required
    def update_recipe(recipe_id):
        if current_user.role != 'admin':
            return jsonify({'error': 'Admin only'}), 403
        recipe = Recipe.query.get_or_404(recipe_id)
        data = request.get_json()
        for field in ('title', 'description', 'image_url', 'cook_time', 'servings',
                      'category_id', 'is_veg', 'cuisine', 'price', 'ingredients', 'steps'):
            if field in data:
                setattr(recipe, field, data[field])
        db.session.commit()
        return jsonify(recipe.to_dict())

    @app.route('/api/recipes/<int:recipe_id>', methods=['DELETE'])
    @login_required
    def delete_recipe(recipe_id):
        if current_user.role != 'admin':
            return jsonify({'error': 'Admin only'}), 403
        recipe = Recipe.query.get_or_404(recipe_id)
        db.session.delete(recipe)
        db.session.commit()
        return jsonify({'message': 'Deleted'})

    # ── REVIEWS ─────────────────────────────────────────────────────────────────
    @app.route('/api/reviews/<int:recipe_id>', methods=['GET'])
    def get_reviews(recipe_id):
        reviews = Review.query.filter_by(recipe_id=recipe_id).order_by(Review.created_at.desc()).all()
        return jsonify([r.to_dict() for r in reviews])

    @app.route('/api/reviews/<int:recipe_id>', methods=['POST'])
    @login_required
    def add_review(recipe_id):
        Recipe.query.get_or_404(recipe_id)
        data = request.get_json()
        existing = Review.query.filter_by(recipe_id=recipe_id, user_id=current_user.id).first()
        if existing:
            existing.rating = data.get('rating', existing.rating)
            existing.comment = data.get('comment', existing.comment)
            db.session.commit()
            return jsonify(existing.to_dict())
        review = Review(recipe_id=recipe_id, user_id=current_user.id,
                        rating=data['rating'], comment=data.get('comment', ''))
        db.session.add(review)
        db.session.commit()
        return jsonify(review.to_dict()), 201

    # ── FAVOURITES ──────────────────────────────────────────────────────────────
    @app.route('/api/favourites', methods=['GET'])
    @login_required
    def get_favourites():
        favs = Favourite.query.filter_by(user_id=current_user.id).all()
        return jsonify([f.to_dict() for f in favs])

    @app.route('/api/favourites/<int:recipe_id>', methods=['POST'])
    @login_required
    def add_favourite(recipe_id):
        Recipe.query.get_or_404(recipe_id)
        existing = Favourite.query.filter_by(user_id=current_user.id, recipe_id=recipe_id).first()
        if existing:
            return jsonify({'message': 'Already in favourites'}), 200
        fav = Favourite(user_id=current_user.id, recipe_id=recipe_id)
        db.session.add(fav)
        db.session.commit()
        return jsonify(fav.to_dict()), 201

    @app.route('/api/favourites/<int:recipe_id>', methods=['DELETE'])
    @login_required
    def remove_favourite(recipe_id):
        fav = Favourite.query.filter_by(user_id=current_user.id, recipe_id=recipe_id).first()
        if not fav:
            return jsonify({'error': 'Not found'}), 404
        db.session.delete(fav)
        db.session.commit()
        return jsonify({'message': 'Removed from favourites'})

    @app.route('/api/favourites/ids', methods=['GET'])
    @login_required
    def get_favourite_ids():
        favs = Favourite.query.filter_by(user_id=current_user.id).all()
        return jsonify([f.recipe_id for f in favs])

    # ── CART ────────────────────────────────────────────────────────────────────
    @app.route('/api/cart', methods=['GET'])
    @login_required
    def get_cart():
        items = CartItem.query.filter_by(user_id=current_user.id).all()
        return jsonify([i.to_dict() for i in items])

    @app.route('/api/cart', methods=['POST'])
    @login_required
    def add_to_cart():
        data = request.get_json()
        recipe_id = data.get('recipe_id')
        quantity = data.get('quantity', 1)
        Recipe.query.get_or_404(recipe_id)
        existing = CartItem.query.filter_by(user_id=current_user.id, recipe_id=recipe_id).first()
        if existing:
            existing.quantity += quantity
            db.session.commit()
            return jsonify(existing.to_dict())
        item = CartItem(user_id=current_user.id, recipe_id=recipe_id, quantity=quantity)
        db.session.add(item)
        db.session.commit()
        return jsonify(item.to_dict()), 201

    @app.route('/api/cart/<int:item_id>', methods=['PUT'])
    @login_required
    def update_cart_item(item_id):
        item = CartItem.query.filter_by(id=item_id, user_id=current_user.id).first_or_404()
        data = request.get_json()
        item.quantity = data.get('quantity', item.quantity)
        if item.quantity <= 0:
            db.session.delete(item)
            db.session.commit()
            return jsonify({'message': 'Removed'})
        db.session.commit()
        return jsonify(item.to_dict())

    @app.route('/api/cart/<int:item_id>', methods=['DELETE'])
    @login_required
    def remove_cart_item(item_id):
        item = CartItem.query.filter_by(id=item_id, user_id=current_user.id).first_or_404()
        db.session.delete(item)
        db.session.commit()
        return jsonify({'message': 'Removed'})

    @app.route('/api/cart/clear', methods=['DELETE'])
    @login_required
    def clear_cart():
        CartItem.query.filter_by(user_id=current_user.id).delete()
        db.session.commit()
        return jsonify({'message': 'Cart cleared'})

    # ── ORDERS ──────────────────────────────────────────────────────────────────
    @app.route('/api/orders', methods=['GET'])
    @login_required
    def get_orders():
        orders = Order.query.filter_by(user_id=current_user.id).order_by(Order.created_at.desc()).all()
        return jsonify([o.to_dict() for o in orders])

    @app.route('/api/orders', methods=['POST'])
    @login_required
    def place_order():
        data = request.get_json()
        cart_items = CartItem.query.filter_by(user_id=current_user.id).all()
        if not cart_items:
            return jsonify({'error': 'Cart is empty'}), 400
        total = sum(ci.recipe.price * ci.quantity for ci in cart_items if ci.recipe)
        order = Order(user_id=current_user.id, total=total,
                      status='confirmed', address=data.get('address', ''))
        db.session.add(order)
        db.session.flush()
        for ci in cart_items:
            oi = OrderItem(order_id=order.id, recipe_id=ci.recipe_id,
                           quantity=ci.quantity, price=ci.recipe.price if ci.recipe else 0)
            db.session.add(oi)
        CartItem.query.filter_by(user_id=current_user.id).delete()
        db.session.commit()
        return jsonify(order.to_dict()), 201

    # ── ADMIN ───────────────────────────────────────────────────────────────────
    @app.route('/api/admin/dashboard', methods=['GET'])
    @login_required
    def admin_dashboard():
        if current_user.role != 'admin':
            return jsonify({'error': 'Forbidden'}), 403
        return jsonify({
            'total_users': User.query.count(),
            'total_recipes': Recipe.query.count(),
            'total_orders': Order.query.count(),
            'total_revenue': db.session.query(db.func.sum(Order.total)).scalar() or 0,
            'pending_orders': Order.query.filter_by(status='pending').count(),
            'confirmed_orders': Order.query.filter_by(status='confirmed').count(),
        })

    @app.route('/api/admin/orders', methods=['GET'])
    @login_required
    def admin_get_orders():
        if current_user.role != 'admin':
            return jsonify({'error': 'Forbidden'}), 403
        orders = Order.query.order_by(Order.created_at.desc()).all()
        return jsonify([o.to_dict() for o in orders])

    @app.route('/api/admin/orders/<int:order_id>', methods=['PUT'])
    @login_required
    def admin_update_order(order_id):
        if current_user.role != 'admin':
            return jsonify({'error': 'Forbidden'}), 403
        order = Order.query.get_or_404(order_id)
        data = request.get_json()
        order.status = data.get('status', order.status)
        db.session.commit()
        return jsonify(order.to_dict())

    @app.route('/api/admin/users', methods=['GET'])
    @login_required
    def admin_get_users():
        if current_user.role != 'admin':
            return jsonify({'error': 'Forbidden'}), 403
        users = User.query.all()
        return jsonify([u.to_dict() for u in users])

    return app


app = create_app()

if __name__ == '__main__':
    with app.app_context():
        db.create_all()
    app.run(host='0.0.0.0', port=8080)
