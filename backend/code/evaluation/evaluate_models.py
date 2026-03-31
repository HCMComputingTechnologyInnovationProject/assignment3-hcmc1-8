import matplotlib.pyplot as plt
import seaborn as sns
from sklearn.metrics import classification_report, confusion_matrix, precision_recall_curve, auc

def plot_confusion_matrix(y_true, y_pred, model_name, dataset_name):
    """Generates and displays a heatmap of the confusion matrix."""
    cm = confusion_matrix(y_true, y_pred)
    plt.figure(figsize=(6, 5))
    sns.heatmap(cm, annot=True, fmt="d", cmap="Blues")
    plt.title(f"Confusion Matrix: {model_name} ({dataset_name})")
    plt.ylabel('Actual')
    plt.xlabel('Predicted')
    plt.show()

def get_performance_metrics(y_true, y_pred, model_name):
    """Returns a dictionary of key metrics for comparison."""
    report = classification_report(y_true, y_pred, output_dict=True)
    # We focus on the '1' class (Fraud) because it's the minority class
    metrics = {
        "Model": model_name,
        "Precision": report['1']['precision'],
        "Recall": report['1']['recall'],
        "F1-Score": report['1']['f1-score'],
        "Accuracy": report['accuracy']
    }
    return metrics