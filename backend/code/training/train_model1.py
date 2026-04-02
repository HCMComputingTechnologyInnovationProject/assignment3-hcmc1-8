import joblib
import matplotlib.pyplot as plt
import seaborn as sns
from sklearn.metrics import confusion_matrix, roc_curve, auc

from training_pipeline import (
    parse_args, train_model_by_key, build_shared_split, 
    MODEL_CONFIGS, MODELS_DIR, FIGURES_DIR
)

def generate_graphs(model_key: str, args):
    config = MODEL_CONFIGS[model_key]
    
    # 1. Rebuild train/test split
    X_train, X_test, y_train, y_test, _ = build_shared_split(
        rows=args.rows, test_size=args.test_size, random_state=args.random_state
    )
    
    # 2. Load the trained model
    saved_artifact = joblib.load(MODELS_DIR / config.artifact_name)
    model = saved_artifact["model"]
    
    # 3. Predict on both sets
    train_preds = model.predict(X_train)
    test_preds = model.predict(X_test)
    
    # --- GRAPH 1: Training Prediction (Confusion Matrix) ---
    plt.figure(figsize=(6, 5))
    sns.heatmap(confusion_matrix(y_train, train_preds), annot=True, fmt="d", cmap="Blues")
    plt.title(f"Training Prediction - {config.display_name}")
    plt.ylabel("Actual")
    plt.xlabel("Predicted")
    plt.tight_layout()
    plt.savefig(FIGURES_DIR / f"{model_key}_training_prediction.png")
    plt.close()
    
    # --- GRAPH 2: Test Prediction (Confusion Matrix) ---
    plt.figure(figsize=(6, 5))
    sns.heatmap(confusion_matrix(y_test, test_preds), annot=True, fmt="d", cmap="Greens")
    plt.title(f"Test Prediction - {config.display_name}")
    plt.ylabel("Actual")
    plt.xlabel("Predicted")
    plt.tight_layout()
    plt.savefig(FIGURES_DIR / f"{model_key}_test_prediction.png")
    plt.close()
    
    # --- GRAPH 3: Training Curve (ROC Curve Train vs Test) ---
    plt.figure(figsize=(8, 6))
    
    y_train_proba = model.predict_proba(X_train)[:, 1]
    fpr_tr, tpr_tr, _ = roc_curve(y_train, y_train_proba)
    plt.plot(fpr_tr, tpr_tr, label=f'Train AUC: {auc(fpr_tr, tpr_tr):.3f}', color='blue')
    
    y_test_proba = model.predict_proba(X_test)[:, 1]
    fpr_te, tpr_te, _ = roc_curve(y_test, y_test_proba)
    plt.plot(fpr_te, tpr_te, label=f'Test AUC: {auc(fpr_te, tpr_te):.3f}', color='green')
    
    plt.plot([0, 1], [0, 1], 'k--')
    plt.title(f"Training Curve (ROC) - {config.display_name}")
    plt.xlabel("False Positive Rate")
    plt.ylabel("True Positive Rate")
    plt.legend(loc="lower right")
    plt.tight_layout()
    plt.savefig(FIGURES_DIR / f"{model_key}_training_curve.png")
    plt.close()

    print(f"--> Successfully generated and saved 3 graphs for {config.display_name} to: {FIGURES_DIR}")

if __name__ == "__main__":
    args = parse_args()
    model_key = "logistic_regression"
    
    # Run training pipeline first
    train_model_by_key(
        model_key, rows=args.rows, test_size=args.test_size, random_state=args.random_state
    )
    # Generate graphs
    generate_graphs(model_key, args)