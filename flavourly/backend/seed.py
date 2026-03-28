"""Seed the database with sample data."""
from app import create_app
from models import db, User, Category, Recipe, Review

CATEGORIES = [
    {'name': 'Breakfast', 'icon': '🌅'},
    {'name': 'Lunch', 'icon': '🍱'},
    {'name': 'Dinner', 'icon': '🍽️'},
    {'name': 'Snacks', 'icon': '🍿'},
    {'name': 'Desserts', 'icon': '🍰'},
    {'name': 'Drinks', 'icon': '🥤'},
]

USERS = [
    {'username': 'admin', 'email': 'admin@flavourly.com', 'password': 'admin123', 'role': 'admin'},
    {'username': 'chef_sarah', 'email': 'sarah@flavourly.com', 'password': 'sarah123', 'role': 'admin'},
    {'username': 'foodie_raj', 'email': 'raj@example.com', 'password': 'raj123', 'role': 'user'},
    {'username': 'priya_cooks', 'email': 'priya@example.com', 'password': 'priya123', 'role': 'user'},
    {'username': 'mike_eats', 'email': 'mike@example.com', 'password': 'mike123', 'role': 'user'},
]

RECIPES = [
    # Breakfast
    {
        'title': 'Fluffy Masala Omelette',
        'description': 'A perfectly spiced, golden omelette loaded with onions, tomatoes, green chillies, and fresh coriander. Quick, satisfying, and packed with flavour.',
        'image_url': 'https://images.unsplash.com/photo-1510693206972-df098062cb71?w=600',
        'cook_time': 10, 'servings': 1, 'category': 'Breakfast',
        'is_veg': False, 'cuisine': 'Indian', 'price': 129.0,
        'ingredients': 'Eggs, Onion, Tomato, Green chilli, Coriander, Salt, Pepper, Oil',
        'steps': '1. Beat eggs. 2. Sauté vegetables. 3. Pour eggs, fold and serve.'
    },
    {
        'title': 'Avocado Toast Supreme',
        'description': 'Creamy smashed avocado on toasted sourdough, topped with chilli flakes, cherry tomatoes, and a drizzle of olive oil.',
        'image_url': 'https://images.unsplash.com/photo-1588137378633-dea1336ce1e2?w=600',
        'cook_time': 8, 'servings': 1, 'category': 'Breakfast',
        'is_veg': True, 'cuisine': 'Western', 'price': 179.0,
        'ingredients': 'Sourdough bread, Avocado, Lemon, Chilli flakes, Cherry tomatoes, Olive oil, Salt',
        'steps': '1. Toast bread. 2. Smash avocado with lemon and salt. 3. Spread and top with tomatoes.'
    },
    {
        'title': 'South Indian Idli Sambar',
        'description': 'Soft, pillowy steamed rice cakes served with a rich, tangy lentil sambar and fresh coconut chutney. A classic comfort breakfast.',
        'image_url': 'https://images.unsplash.com/photo-1630383249896-424e482df921?w=600',
        'cook_time': 40, 'servings': 3, 'category': 'Breakfast',
        'is_veg': True, 'cuisine': 'South Indian', 'price': 99.0,
        'ingredients': 'Idli batter, Toor dal, Vegetables, Sambar powder, Tamarind, Mustard seeds, Curry leaves',
        'steps': '1. Steam idlis. 2. Cook sambar with dal and veggies. 3. Temper and serve together.'
    },
    # Lunch
    {
        'title': 'Butter Chicken (Murgh Makhani)',
        'description': 'Tender chicken pieces bathed in a velvety, mildly spiced tomato and cream sauce. India\'s most beloved dish, best enjoyed with naan.',
        'image_url': 'https://images.unsplash.com/photo-1588166524941-3bf61a9c41db?w=600',
        'cook_time': 45, 'servings': 4, 'category': 'Lunch',
        'is_veg': False, 'cuisine': 'North Indian', 'price': 329.0,
        'ingredients': 'Chicken, Tomatoes, Cream, Butter, Onion, Ginger, Garlic, Kashmiri chilli, Garam masala',
        'steps': '1. Marinate and grill chicken. 2. Make tomato-cream sauce. 3. Combine and simmer.'
    },
    {
        'title': 'Paneer Tikka Masala',
        'description': 'Chargrilled cottage cheese cubes in a smoky, spiced tomato gravy. A vegetarian showstopper that rivals any meat dish.',
        'image_url': 'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=600',
        'cook_time': 35, 'servings': 3, 'category': 'Lunch',
        'is_veg': True, 'cuisine': 'North Indian', 'price': 269.0,
        'ingredients': 'Paneer, Yogurt, Capsicum, Onion, Tomato, Cream, Spices, Coriander',
        'steps': '1. Marinate paneer. 2. Grill tikkas. 3. Prepare masala gravy and combine.'
    },
    {
        'title': 'Mediterranean Grain Bowl',
        'description': 'A vibrant bowl of quinoa, roasted chickpeas, cucumber, Kalamata olives, feta, and a lemon-tahini dressing. Light yet filling.',
        'image_url': 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=600',
        'cook_time': 25, 'servings': 2, 'category': 'Lunch',
        'is_veg': True, 'cuisine': 'Mediterranean', 'price': 249.0,
        'ingredients': 'Quinoa, Chickpeas, Cucumber, Olives, Feta, Tahini, Lemon, Mixed greens',
        'steps': '1. Cook quinoa. 2. Roast chickpeas. 3. Assemble bowl and drizzle dressing.'
    },
    # Dinner
    {
        'title': 'Prawn Biryani',
        'description': 'Fragrant, layered basmati rice cooked with succulent prawns, whole spices, caramelised onions, and saffron. A coastal feast.',
        'image_url': 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=600',
        'cook_time': 60, 'servings': 4, 'category': 'Dinner',
        'is_veg': False, 'cuisine': 'Indian', 'price': 399.0,
        'ingredients': 'Basmati rice, Prawns, Onions, Yogurt, Saffron, Whole spices, Mint, Ghee',
        'steps': '1. Parboil rice. 2. Cook spiced prawn masala. 3. Layer and dum cook.'
    },
    {
        'title': 'Spaghetti Carbonara',
        'description': 'Classic Roman pasta with al dente spaghetti, crispy pancetta, creamy egg-cheese sauce, and cracked black pepper. No cream needed.',
        'image_url': 'https://images.unsplash.com/photo-1612874742237-6526221588e3?w=600',
        'cook_time': 20, 'servings': 2, 'category': 'Dinner',
        'is_veg': False, 'cuisine': 'Italian', 'price': 289.0,
        'ingredients': 'Spaghetti, Pancetta, Eggs, Pecorino Romano, Black pepper, Garlic',
        'steps': '1. Cook pasta. 2. Crisp pancetta. 3. Mix egg-cheese sauce off heat. 4. Toss and serve.'
    },
    {
        'title': 'Dal Makhani',
        'description': 'Slow-cooked black lentils and kidney beans in a rich, buttery tomato gravy. Simmered overnight for deep, complex flavour.',
        'image_url': 'https://images.unsplash.com/photo-1546833998-877b37c2e582?w=600',
        'cook_time': 90, 'servings': 4, 'category': 'Dinner',
        'is_veg': True, 'cuisine': 'North Indian', 'price': 229.0,
        'ingredients': 'Black lentils, Kidney beans, Tomatoes, Butter, Cream, Ginger, Garlic, Spices',
        'steps': '1. Soak lentils overnight. 2. Pressure cook. 3. Simmer with tomato-butter sauce for 1 hour.'
    },
    # Snacks
    {
        'title': 'Crispy Samosa Chaat',
        'description': 'Golden, flaky samosas crushed and piled high with chickpeas, tangy tamarind chutney, green chutney, yogurt, and sev.',
        'image_url': 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=600',
        'cook_time': 15, 'servings': 2, 'category': 'Snacks',
        'is_veg': True, 'cuisine': 'Indian', 'price': 89.0,
        'ingredients': 'Samosas, Chickpeas, Yogurt, Tamarind chutney, Green chutney, Sev, Onion, Coriander',
        'steps': '1. Crush samosas on a plate. 2. Top with chickpeas and chutneys. 3. Add yogurt and sev.'
    },
    {
        'title': 'Cheesy Loaded Nachos',
        'description': 'Tortilla chips loaded with melted cheddar, jalapeños, black beans, guacamole, salsa, and sour cream. Game-night perfect.',
        'image_url': 'https://images.unsplash.com/photo-1513456852971-30c0b8199d4d?w=600',
        'cook_time': 15, 'servings': 3, 'category': 'Snacks',
        'is_veg': True, 'cuisine': 'Mexican', 'price': 199.0,
        'ingredients': 'Tortilla chips, Cheddar, Jalapeños, Black beans, Guacamole, Salsa, Sour cream',
        'steps': '1. Layer chips and cheese. 2. Bake until melted. 3. Top with toppings and serve immediately.'
    },
    # Desserts
    {
        'title': 'Gulab Jamun',
        'description': 'Soft, melt-in-your-mouth milk-solid dumplings soaked in fragrant rose and cardamom sugar syrup. India\'s favourite sweet.',
        'image_url': 'https://images.unsplash.com/photo-1666769954665-8bcf3a4e80a1?w=600',
        'cook_time': 30, 'servings': 6, 'category': 'Desserts',
        'is_veg': True, 'cuisine': 'Indian', 'price': 79.0,
        'ingredients': 'Khoya, Maida, Milk, Sugar, Rose water, Cardamom, Saffron, Oil',
        'steps': '1. Make dough with khoya and maida. 2. Roll and deep fry. 3. Soak in warm sugar syrup.'
    },
    {
        'title': 'New York Cheesecake',
        'description': 'Dense, creamy, and perfectly tangy baked cheesecake on a buttery graham cracker crust. Served with fresh berry compote.',
        'image_url': 'https://images.unsplash.com/photo-1524351199678-941a58a3df50?w=600',
        'cook_time': 70, 'servings': 8, 'category': 'Desserts',
        'is_veg': True, 'cuisine': 'American', 'price': 249.0,
        'ingredients': 'Cream cheese, Eggs, Sugar, Vanilla, Graham crackers, Butter, Sour cream, Berries',
        'steps': '1. Make crust and press in pan. 2. Mix filling. 3. Bake in water bath. 4. Chill overnight.'
    },
    {
        'title': 'Mango Kulfi',
        'description': 'Rich, dense Indian ice cream made with reduced condensed milk and fresh Alphonso mango pulp. Frozen on bamboo sticks.',
        'image_url': 'https://images.unsplash.com/photo-1544662280-e6b50c9a0e22?w=600',
        'cook_time': 20, 'servings': 6, 'category': 'Desserts',
        'is_veg': True, 'cuisine': 'Indian', 'price': 99.0,
        'ingredients': 'Full-fat milk, Condensed milk, Mango pulp, Cardamom, Saffron, Pistachios',
        'steps': '1. Reduce milk. 2. Mix in mango and spices. 3. Pour in moulds and freeze for 6 hours.'
    },
    # Drinks
    {
        'title': 'Mango Lassi',
        'description': 'Thick, chilled blend of ripe Alphonso mangoes, creamy yogurt, a hint of cardamom, and sugar. The ultimate summer drink.',
        'image_url': 'https://images.unsplash.com/photo-1571091718767-18b5b1457add?w=600',
        'cook_time': 5, 'servings': 2, 'category': 'Drinks',
        'is_veg': True, 'cuisine': 'Indian', 'price': 89.0,
        'ingredients': 'Mango pulp, Yogurt, Milk, Sugar, Cardamom, Ice',
        'steps': '1. Blend all ingredients until smooth. 2. Pour over ice and serve chilled.'
    },
    {
        'title': 'Masala Chai',
        'description': 'Warming spiced Indian tea brewed with ginger, cardamom, cinnamon, and cloves. Simmered with milk for that perfect balance.',
        'image_url': 'https://images.unsplash.com/photo-1596591868231-05e38b5a6660?w=600',
        'cook_time': 10, 'servings': 2, 'category': 'Drinks',
        'is_veg': True, 'cuisine': 'Indian', 'price': 49.0,
        'ingredients': 'Tea leaves, Milk, Water, Ginger, Cardamom, Cinnamon, Cloves, Sugar',
        'steps': '1. Boil water with spices. 2. Add tea leaves. 3. Add milk and sugar. 4. Simmer and strain.'
    },
    {
        'title': 'Cold Brew Coffee Float',
        'description': 'Smooth, concentrate cold brew coffee poured over vanilla ice cream — the perfect blend of bitter coffee and sweet cream.',
        'image_url': 'https://images.unsplash.com/photo-1461023058943-07fcbe16d735?w=600',
        'cook_time': 5, 'servings': 1, 'category': 'Drinks',
        'is_veg': True, 'cuisine': 'Western', 'price': 159.0,
        'ingredients': 'Cold brew coffee, Vanilla ice cream, Chocolate syrup, Ice',
        'steps': '1. Fill glass with ice. 2. Pour cold brew. 3. Float ice cream scoop. 4. Drizzle chocolate syrup.'
    },
    {
        'title': 'Peri Peri Chicken Wings',
        'description': 'Fiery Mozambican-Portuguese peri peri marinated chicken wings, grilled to perfection with charred edges. Served with creamy dip.',
        'image_url': 'https://images.unsplash.com/photo-1567620832903-9fc6debc209f?w=600',
        'cook_time': 35, 'servings': 3, 'category': 'Snacks',
        'is_veg': False, 'cuisine': 'African', 'price': 259.0,
        'ingredients': 'Chicken wings, Bird\'s eye chilli, Lemon, Garlic, Paprika, Oregano, Olive oil',
        'steps': '1. Blend peri peri marinade. 2. Marinate wings 2 hours. 3. Grill until charred and cooked through.'
    },
]

SAMPLE_REVIEWS = [
    {'recipe_title': 'Butter Chicken (Murgh Makhani)', 'username': 'foodie_raj', 'rating': 5, 'comment': 'Absolutely divine! The sauce is so rich and creamy. Best butter chicken I\'ve had outside a restaurant!'},
    {'recipe_title': 'Butter Chicken (Murgh Makhani)', 'username': 'priya_cooks', 'rating': 4, 'comment': 'Wonderful recipe. Added extra cream and it was perfect. My family loved it!'},
    {'recipe_title': 'Paneer Tikka Masala', 'username': 'mike_eats', 'rating': 5, 'comment': 'I\'m not usually a veggie person but this converted me. The chargrilled paneer is incredible!'},
    {'recipe_title': 'Mango Lassi', 'username': 'foodie_raj', 'rating': 5, 'comment': 'Refreshing and perfect. Tastes just like the ones from my favourite Indian restaurant!'},
    {'recipe_title': 'Prawn Biryani', 'username': 'priya_cooks', 'rating': 5, 'comment': 'Labour of love but SO worth it. The dum cooking makes all the difference.'},
    {'recipe_title': 'New York Cheesecake', 'username': 'mike_eats', 'rating': 4, 'comment': 'Turned out beautifully! Dense and creamy just like it should be.'},
    {'recipe_title': 'South Indian Idli Sambar', 'username': 'foodie_raj', 'rating': 5, 'comment': 'Reminds me of home! The sambar spice blend is spot on.'},
    {'recipe_title': 'Masala Chai', 'username': 'priya_cooks', 'rating': 5, 'comment': 'Finally the perfect chai recipe. The ginger-cardamom ratio is just right!'},
]


def seed():
    app = create_app()
    with app.app_context():
        db.drop_all()
        db.create_all()
        print("✓ Tables created")

        # Categories
        cat_map = {}
        for c in CATEGORIES:
            cat = Category(**c)
            db.session.add(cat)
            db.session.flush()
            cat_map[c['name']] = cat.id
        print("✓ Categories seeded")

        # Users
        user_map = {}
        for u in USERS:
            user = User(username=u['username'], email=u['email'], role=u['role'])
            user.set_password(u['password'])
            db.session.add(user)
            db.session.flush()
            user_map[u['username']] = user.id
        print("✓ Users seeded")

        # Recipes
        recipe_map = {}
        for r_data in RECIPES:
            r = Recipe(
                title=r_data['title'],
                description=r_data['description'],
                image_url=r_data['image_url'],
                cook_time=r_data['cook_time'],
                servings=r_data['servings'],
                category_id=cat_map[r_data['category']],
                is_veg=r_data['is_veg'],
                cuisine=r_data['cuisine'],
                price=r_data['price'],
                ingredients=r_data['ingredients'],
                steps=r_data['steps'],
                created_by=user_map['admin']
            )
            db.session.add(r)
            db.session.flush()
            recipe_map[r_data['title']] = r.id
        print("✓ Recipes seeded")

        # Reviews
        for rv in SAMPLE_REVIEWS:
            if rv['recipe_title'] in recipe_map and rv['username'] in user_map:
                review = Review(
                    recipe_id=recipe_map[rv['recipe_title']],
                    user_id=user_map[rv['username']],
                    rating=rv['rating'],
                    comment=rv['comment']
                )
                db.session.add(review)
        print("✓ Reviews seeded")

        db.session.commit()
        print("\n🎉 Database seeded successfully!")
        print("\n📋 Login Credentials:")
        print("  Admin: admin@flavourly.com / admin123")
        print("  Admin: sarah@flavourly.com / sarah123")
        print("  User:  raj@example.com / raj123")
        print("  User:  priya@example.com / priya123")
        print("  User:  mike@example.com / mike123")


if __name__ == '__main__':
    seed()
