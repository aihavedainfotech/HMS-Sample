import pandas as pd
import numpy as np
from xgboost import XGBRegressor
from sklearn.preprocessing import LabelEncoder
import os

class BillPredictor:
    def __init__(self, data_path=None):
        # allow override via environment variable for flexibility
        self.data_path = data_path or os.getenv('BILL_DATA_PATH', 'hospital_bill_data.csv')
        self.model = None
        self.label_encoders = {}
        # The exact 6 features used in the frontend
        self.features = ['age', 'gender', 'insurance', 'admission_type', 'diagnosis', 'risk_level']
        self.categorical_cols = ['gender', 'insurance', 'admission_type', 'diagnosis', 'risk_level']
        self._initialize_model()

    def _initialize_model(self):
        try:
            print("[AI Bill] Loading dataset and initializing XGBoost model...")
            if not os.path.exists(self.data_path):
                # Missing training data is not fatal; model will remain None
                print(f"[AI Bill] Warning: Dataset not found at {self.data_path}, skipping model initialization")
                return

            df = pd.read_csv(self.data_path)
            
            # Format target and features (we only keep columns we actually predict with)
            df = df[self.features + ['total_bill']].copy()

            # Encode categorical variables
            for col in self.categorical_cols:
                le = LabelEncoder()
                df[col] = df[col].astype(str)
                df[col] = le.fit_transform(df[col])
                self.label_encoders[col] = le

            X = df[self.features]
            y = df['total_bill']

            # Initialize and train model
            self.model = XGBRegressor(n_estimators=100, learning_rate=0.1, random_state=42)
            self.model.fit(X, y)
            print("[AI Bill] Model trained successfully.")

        except Exception as e:
            print(f"[AI Bill] Error initializing model: {e}")

    def predict(self, age, gender, insurance, admission_type, diagnosis, risk_level):
        if self.model is None:
            raise ValueError("Model has not been initialized. Check logs for errors.")

        # Create input dataframe ensuring strictly matching case and ordering
        input_data = pd.DataFrame([{
            'age': age,
            'gender': str(gender),
            'insurance': str(insurance),
            'admission_type': str(admission_type),
            'diagnosis': str(diagnosis),
            'risk_level': str(risk_level)
        }])

        # Encode categorical variables safely
        for col in self.categorical_cols:
            le = self.label_encoders.get(col)
            if le is not None:
                # Handle unseen labels by defaulting to the first known label
                known_classes = list(le.classes_)
                val = input_data.iloc[0][col]
                if val not in known_classes:
                    # Provide default mapping if unknown 
                    print(f"[AI Bill] Warning: Unknown label '{val}' for column '{col}'. Defaulting.")
                    input_data[col] = 0
                else:
                    input_data[col] = le.transform([val])[0]

        # Predict
        prediction = self.model.predict(input_data)[0]
        return float(prediction)

# Singleton instance
predictor = BillPredictor()
