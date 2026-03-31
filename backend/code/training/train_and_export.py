import pandas as pd
import joblib
import json
import os
import matplotlib.pyplot as plt
import seaborn as sns
from sklearn.model_selection import train_test_split
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import classification_report, confusion_matrix, accuracy_score

def run_training_and_eval(dataset_path, target_column, model_name, output_dir="results"):
    # Create directories if they don't exist
    model_dir = os.path.join(output_dir, "models")
    metrics_dir = os.path.join(output_dir, "metrics")
    figures_dir = os.path.join(output_dir, "figures")
    
    for d in [model_dir, metrics_dir, figures_dir]:
        if not os.path.exists(d):
            os.makedirs(d)

    print(f"\nProcessing {model_name}...")
    
    # Check if dataset exists
    if not os.path.exists(dataset_path):
        print(f"Error: Dataset not found at {dataset_path}")
        return

    # 1. Load Data
    df = pd.read_csv(dataset_path)
    X = df.drop(target_column, axis=1)
    y = df[target_column]

    # 2. Split
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

    # 3. Train
    model = LogisticRegression(max_iter=1000)
    model.fit(X_train, y_train)

    # 4. Predict
    y_pred = model.predict(X_test)

    # 5. Save Model
    joblib.dump(model, os.path.join(model_dir, f"{model_name}.pkl"))

    # 6. Generate Metrics
    report = classification_report(y_test, y_pred, output_dict=True)
    metrics = {
        "accuracy": accuracy_score(y_test, y_pred),
        "precision": report['1']['precision'] if '1' in report else report['True']['precision'] if 'True' in report else 0,
        "recall": report['1']['recall'] if '1' in report else report['True']['recall'] if 'True' in report else 0,
        "f1": report['1']['f1-score'] if '1' in report else report['True']['f1-score'] if 'True' in report else 0
    }
    
    with open(os.path.join(metrics_dir, f"{model_name}_metrics.json"), 'w') as f:
        json.dump(metrics, f, indent=4)
    
    # 7. Generate Figure (Confusion Matrix)
    plt.figure(figsize=(8, 6))
    cm = confusion_matrix(y_test, y_pred)
    sns.heatmap(cm, annot=True, fmt='d', cmap='Blues')
    plt.title(f'Confusion Matrix - {model_name}')
    plt.ylabel('Actual')
    plt.xlabel('Predicted')
    plt.tight_layout()
    plt.savefig(os.path.join(figures_dir, f"{model_name}_cm.png"))
    plt.close()

    print(f"Completed {model_name}. Metrics and figures saved.")

if __name__ == "__main__":
    # Point to the correct processed data location
    run_training_and_eval("data/processed/processed_ulb_dataset.csv", "Class", "model1_logistic_regression")
