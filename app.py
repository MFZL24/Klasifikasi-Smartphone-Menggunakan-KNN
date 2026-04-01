from flask import Flask, render_template, request, jsonify
import joblib
import pandas as pd
import numpy as np
import os
import traceback

app = Flask(__name__)

# Paths
MODEL_PATH = os.path.join('models', 'knn_smartphone_segment.joblib')
DATASET_PATH = os.path.join('Dataset', 'smartphone.csv')

# Load the model
try:
    model_obj = joblib.load(MODEL_PATH)
    # Check if it is a dictionary and try to extract the model
    if isinstance(model_obj, dict):
        # Look for typical keys like 'model', 'classifier', etc. 
        # Or just use the first item that has a 'predict' method.
        if 'model' in model_obj:
            model = model_obj['model']
        else:
            model = next((v for v in model_obj.values() if hasattr(v, 'predict')), None)
    else:
        model = model_obj
    
    if model:
        print(f"Model loaded successfully. Type: {type(model)}")
    else:
        print("Model file loaded but no predictor found inside.")
except Exception as e:
    print(f"Error loading model: {e}")
    model = None

# Load dataset for model name search
try:
    df = pd.read_csv(DATASET_PATH)
    # Ensure relevant columns exist
    required_cols = ['brand_name', 'model', 'processor_speed', 'num_cores', 'ram_capacity', 'internal_memory', 'battery_capacity', 'primary_camera_rear', 'primary_camera_front', 'rating', 'price']
    df_clean = df[required_cols].dropna()
    smartphone_list = df_clean.to_dict('records')
    print(f"Dataset loaded: {len(smartphone_list)} records.")
except Exception as e:
    print(f"Error loading dataset: {e}")
    smartphone_list = []

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/explorer')
def explorer():
    return render_template('explorer.html')

@app.route('/history')
def history():
    return render_template('history.html')

@app.route('/models', methods=['GET'])
def get_models():
    # Pre-add predictions to each model for better UX (so user sees results immediately)
    enriched_models = []
    
    # We'll calculate predictions if not already in the list
    global smartphone_list
    
    # Features required for prediction
    features = ['processor_speed', 'num_cores', 'ram_capacity', 'internal_memory', 
                'battery_capacity', 'primary_camera_rear', 'primary_camera_front', 'rating', 'price']
    labels = ['Budget', 'Flagship', 'Midrange']

    for item in smartphone_list:
        if 'ai_prediction' not in item:
            try:
                input_data = [[float(item.get(feat, 0)) for feat in features]]
                X_input = pd.DataFrame(input_data, columns=features)
                pred = model.predict(X_input)[0]
                item['ai_prediction'] = labels[int(pred)]
            except:
                item['ai_prediction'] = 'Unknown'
        
        enriched_models.append({
            'brand': item['brand_name'],
            'model': item['model'],
            'prediction': item['ai_prediction'],
            'price': item.get('price', 0)
        })
        
    return jsonify(enriched_models)

@app.route('/get_specs', methods=['GET'])
def get_specs():
    model_name = request.args.get('name')
    if not model_name:
        return jsonify({'error': 'Name is required'}), 400
    
    # Find the specs for the given model
    match = next((item for item in smartphone_list if item['model'] == model_name), None)
    if match:
        return jsonify(match)
    return jsonify({'error': 'Model not found'}), 444

@app.route('/predict', methods=['POST'])
def predict():
    if model is None:
        return jsonify({'error': 'Model not loaded on server'}), 500
    
    try:
        data = request.json
        print(f"Received prediction request: {data}")
        
        # Features expected by the model (matching the notebook)
        features = [
            'processor_speed', 
            'num_cores', 
            'ram_capacity', 
            'internal_memory', 
            'battery_capacity', 
            'primary_camera_rear', 
            'primary_camera_front', 
            'rating', 
            'price'
        ]
        
        # Extract features from request
        input_data = []
        for feat in features:
            val = data.get(feat)
            if val is None:
                return jsonify({'error': f'Missing feature: {feat}'}), 400
            input_data.append(float(val))
            
        # Create DataFrame for prediction
        X_input = pd.DataFrame([input_data], columns=features)
        
        # Predict
        # Note: If the model uses a scaler pipeline, it will handle scaling
        prediction = model.predict(X_input)
        
        # Mapping based on LabelEncoder classes: 0: Budget, 1: Flagship, 2: Midrange
        labels = ['Budget', 'Flagship', 'Midrange']
        result_label = labels[int(prediction[0])]
        
        # Recommendations (Nearest Neighbors)
        recs = []
        try:
            from sklearn.neighbors import NearestNeighbors
            # Prepare all data for NN (Numerical only)
            X_all = pd.DataFrame(smartphone_list)[features]
            
            # Simple NN (using 7 to skip the exact match if it exists)
            nn = NearestNeighbors(n_neighbors=7)
            nn.fit(X_all)
            
            # Find neighbors for the current input
            distances, indices = nn.kneighbors(X_input)
            
            for idx in indices[0][1:]: # Skip first if it's the exact same model or first match
                phone = smartphone_list[idx]
                
                if 'ai_prediction' not in phone:
                    try:
                        p_data = [[float(phone.get(feat, 0)) for feat in features]]
                        p_input = pd.DataFrame(p_data, columns=features)
                        p_res = model.predict(p_input)[0]
                        phone['ai_prediction'] = labels[int(p_res)]
                    except:
                        phone['ai_prediction'] = 'Unknown'

                recs.append({
                    'model': phone['model'],
                    'brand': phone['brand_name'],
                    'price': phone['price'],
                    'ram': phone['ram_capacity'],
                    'prediction': phone['ai_prediction']
                })
        except Exception as e:
            print(f"Recommendation Engine Error: {e}")

        return jsonify({
            'prediction': result_label,
            'status': 'success',
            'recommendations': recs
        })
        
    except Exception as e:
        print("Prediction Error:")
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, port=5000)
