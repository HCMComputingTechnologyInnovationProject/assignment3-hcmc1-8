import pandas as pd
import joblib
import os
from sklearn.model_selection import train_test_split
from xgboost import XGBClassifier
from sklearn.metrics import accuracy_score, classification_report

def train_model(dataset_path, target_column, model_name):
    if not os.path.exists(dataset_path):
        print(f"❌ File not found: {dataset_path}")
        return

    print(f"Loading dataset: {dataset_path}...")
    df = pd.read_csv(dataset_path)

    X = df.drop(target_column, axis=1)
    y = df[target_column]

    X_train, X_test, y_train, y_test = train_test_split(
        X, y,
        test_size=0.2,
        random_state=42
    )

    print(f"Training XGBoost model: {model_name}...")
    # Cấu hình XGBoost cho bài toán phân loại
    model = XGBClassifier(
        n_estimators=100,
        max_depth=6,
        learning_rate=0.1,
        random_state=42,
        use_label_encoder=False,
        eval_metric='logloss',
        n_jobs=-1
    )

    model.fit(X_train, y_train)

    predictions = model.predict(X_test)
    accuracy = accuracy_score(y_test, predictions)

    print(f"=== Results for {model_name} ===")
    print("Accuracy:", round(accuracy, 4))
    print(classification_report(y_test, predictions))

    # Lưu model vào thư mục models (Lùi 2 cấp từ training/ để vào results/models)
    output_path = f"../../results/models/{model_name}.pkl"
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    joblib.dump(model, output_path)
    print(f"✅ Model saved to: {output_path}\n")

if __name__ == "__main__":
    # Chạy huấn luyện cho cả 3 dataset giống Model 3 của Nam
    train_model("../../data/processed/processed_ulb_dataset.csv", "Class", "xgboost_ulb")
    train_model("../../data/processed/processed_ieee_dataset.csv", "isFraud", "xgboost_ieee")
    train_model("../../data/processed/processed_paysim_dataset.csv", "isFraud", "xgboost_paysim")