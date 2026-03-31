import pandas as pd
import joblib

from sklearn.ensemble import IsolationForest
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score


def train_model(dataset_path, target_column, model_name):

    df = pd.read_csv(dataset_path)

    X = df.drop(target_column, axis=1)
    y = df[target_column]

    X_train, X_test, y_train, y_test = train_test_split(
        X, y,
        test_size=0.2,
        random_state=42
    )

    model = IsolationForest(
        n_estimators=100,
        contamination=0.01,
        random_state=42
    )

    model.fit(X_train)

    predictions = model.predict(X_test)

    predictions = [1 if p == -1 else 0 for p in predictions]

    accuracy = accuracy_score(y_test, predictions)

    print("Model:", model_name)
    print("Accuracy:", accuracy)

    joblib.dump(model, f"../../models/{model_name}.pkl")



if __name__ == "_main_":

    train_model("../../data/processed/processed_ulb_dataset.csv", "Class", "isolation_ulb")

    train_model("../../data/processed/processed_ieee_dataset.csv", "isFraud", "isolation_ieee")

    train_model("../../data/processed/processed_paysim_dataset.csv", "isFraud", "isolation_paysim")