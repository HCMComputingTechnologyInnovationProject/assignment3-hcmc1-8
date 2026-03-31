import pandas as pd
import joblib

from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, classification_report


def train_model(dataset_path, target_column, model_name):

    df = pd.read_csv(dataset_path)

    X = df.drop(target_column, axis=1)
    y = df[target_column]

    X_train, X_test, y_train, y_test = train_test_split(
        X, y,
        test_size=0.2,
        random_state=42
    )

    model = RandomForestClassifier(
        n_estimators=100,
        random_state=42,
        n_jobs=-1
    )

    model.fit(X_train, y_train)

    predictions = model.predict(X_test)

    accuracy = accuracy_score(y_test, predictions)

    print("Model:", model_name)
    print("Accuracy:", accuracy)
    print(classification_report(y_test, predictions))

    joblib.dump(model, f"../../models/{model_name}.pkl")



if __name__ == "_main_":

    train_model("../../data/processed/processed_ulb_dataset.csv", "Class", "rf_ulb")

    train_model("../../data/processed/processed_ieee_dataset.csv", "isFraud", "rf_ieee")

    train_model("../../data/processed/processed_paysim_dataset.csv", "isFraud", "rf_paysim")