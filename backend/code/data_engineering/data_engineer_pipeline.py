import pandas as pd
import numpy as np
import seaborn as sns
import matplotlib.pyplot as plt

from sklearn.preprocessing import RobustScaler, LabelEncoder

print("Starting Data Engineering Pipeline")

# =====================================
# DATASET ANALYSIS
# =====================================

def analyze_dataset(df, name, label):

    print("\n================================")
    print(f"Dataset: {name}")
    print("================================")

    print("\nDataset Size:")
    print(df.shape)

    print("\nFeatures:")
    print(len(df.columns))

    print("\nData Types:")
    print(df.dtypes.value_counts())

    print("\nMissing Values:")
    print(df.isnull().sum().sum())

    print("\nDuplicates:")
    print(df.duplicated().sum())

    if label in df.columns:
        print("\nClass Distribution:")
        print(df[label].value_counts())


# =====================================
# DATA PROCESSING
# =====================================

def process_dataset(df):

    # Remove duplicates
    df = df.drop_duplicates()

    # Handle missing values
    df = df.fillna(df.median(numeric_only=True))

    # Encode categorical variables
    for column in df.select_dtypes(include=['object','string']).columns:
        encoder = LabelEncoder()
        df[column] = encoder.fit_transform(df[column].astype(str))

    # Feature scaling
    scaler = RobustScaler()

    numeric_cols = df.select_dtypes(include=['int64','float64']).columns

    df[numeric_cols] = scaler.fit_transform(df[numeric_cols])

    return df


# =====================================
# EDA VISUALIZATION
# =====================================

def run_eda(df, label):

    print("\nRunning EDA...")

    sns.set(style="whitegrid")

    # Class Distribution
    if label in df.columns:

        plt.figure(figsize=(6,4))
        sns.countplot(x=label, data=df)
        plt.title("Class Distribution")
        plt.show()

    # Histogram of first numeric feature
    numeric_cols = df.select_dtypes(include=['float64','int64']).columns

    if len(numeric_cols) > 0:

        plt.figure(figsize=(8,4))
        sns.histplot(df[numeric_cols[0]], bins=50)
        plt.title(f"Distribution of {numeric_cols[0]}")
        plt.show()

    # Correlation Heatmap
    plt.figure(figsize=(12,8))
    corr_matrix = df.corr()

    sns.heatmap(corr_matrix, cmap='coolwarm', center=0)

    plt.title("Correlation Heatmap")

    plt.show()


# =====================================
# FEATURE IMPORTANCE
# =====================================

def feature_analysis(df, label):

    if label not in df.columns:
        return

    print("\nTop Features Correlated with Fraud:")

    corr_with_class = df.corr()[label].sort_values(ascending=False)

    print(corr_with_class)

    top_features = corr_with_class.drop(label).head(10)

    print("\nTop 10 Features:")
    print(top_features)

    plt.figure(figsize=(8,6))

    sns.barplot(x=top_features.values, y=top_features.index)

    plt.title("Top Correlated Features")

    plt.xlabel("Correlation Value")

    plt.ylabel("Feature")

    plt.show()


# =====================================
# 1. ULB DATASET
# =====================================

print("\nLoading ULB dataset...")

ulb = pd.read_csv("creditcard.csv")

analyze_dataset(ulb, "ULB Credit Card Fraud", "Class")

ulb = process_dataset(ulb)

run_eda(ulb, "Class")

feature_analysis(ulb, "Class")

ulb.to_csv("processed_ulb_dataset.csv", index=False)


# =====================================
# 2. IEEE DATASET
# =====================================

print("\nLoading IEEE dataset...")

transaction = pd.read_csv("train_transaction.csv")
identity = pd.read_csv("train_identity.csv")

ieee = pd.merge(transaction, identity, on="TransactionID", how="left")

analyze_dataset(ieee, "IEEE Fraud Dataset", "isFraud")

ieee = process_dataset(ieee)

run_eda(ieee, "isFraud")

feature_analysis(ieee, "isFraud")

ieee.to_csv("processed_ieee_dataset.csv", index=False)


# =====================================
# 3. PAYSIM DATASET
# =====================================

print("\nLoading PaySim dataset...")

paysim = pd.read_csv("PS_20174392719_1491204439457_log.csv")

analyze_dataset(paysim, "PaySim Dataset", "isFraud")

paysim = process_dataset(paysim)

run_eda(paysim, "isFraud")

feature_analysis(paysim, "isFraud")

paysim.to_csv("processed_paysim_dataset.csv", index=False)


print("\nAll datasets processed successfully")