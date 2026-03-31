# Financial Fraud Detection using Machine Learning

## Project Overview
This project focuses on applying machine learning techniques to detect fraudulent financial transactions in banking systems. With the rapid growth of digital banking and online payments, fraud detection has become a critical challenge for financial institutions. Traditional rule-based systems are often insufficient to detect evolving fraud patterns.

In this project, multiple machine learning algorithms are implemented to identify suspicious transactions based on historical financial data. The goal is to analyze transaction patterns and classify them as either legitimate or fraudulent.

The project explores different fraud detection datasets and evaluates the performance of several machine learning models to determine the most effective approach.

---

## Live Demo Video 
Link: https://drive.google.com/file/d/1PLHuDxLnaxcmUVNOH0jQgAc8zremwrBc/view?usp=sharing 

## Objectives
The main objectives of this project are:

- Analyze financial transaction datasets for fraud detection.
- Perform data preprocessing and feature engineering.
- Implement machine learning models for fraud detection.
- Evaluate model performance using classification metrics.
- Compare different machine learning approaches.

---

## Datasets
Three financial fraud datasets were considered in this project:

1. **ULB Credit Card Fraud Dataset**
   - 284,807 transactions
   - 31 features
   - Highly imbalanced dataset
   - Real anonymized credit card transactions

2. **IEEE-CIS Fraud Detection Dataset**
   - 590,540 transactions
   - 434 features
   - Large number of missing values
   - Complex transaction and identity data

3. **PaySim Financial Fraud Dataset**
   - 6,362,620 transactions
   - 11 features
   - Simulated mobile financial transactions

The **ULB Credit Card Fraud dataset** was selected as the primary dataset for model development due to its clean structure and manageable feature size.

---

## Data Preprocessing
Before applying machine learning models, the datasets underwent several preprocessing steps:

- Dataset inspection
- Duplicate record removal
- Missing value handling (median imputation)
- Categorical feature encoding
- Feature scaling using RobustScaler
- Feature correlation analysis

These steps ensure that the dataset is clean and suitable for machine learning algorithms.

---

## Machine Learning Models
Three machine learning models were implemented in this project:

### Model 1 – Logistic Regression
A supervised classification model used as a baseline for fraud detection. Logistic Regression estimates the probability of a transaction being fraudulent based on transaction features.

### Model 2 – Isolation Forest
An unsupervised anomaly detection algorithm designed to identify unusual transactions. It isolates anomalies by randomly partitioning the data, making it effective for detecting rare fraud cases.

### Model 3 – Random Forest
An ensemble learning method that constructs multiple decision trees and combines their outputs to improve classification accuracy and robustness.

---

## Implementation Pipeline
The machine learning workflow followed a structured pipeline:

1. Data preprocessing
2. Feature and target separation
3. Train-test split (80/20)
4. Model training
5. Prediction on test data
6. Model evaluation

The models were implemented using Python and the Scikit-learn library.

---

## Evaluation Metrics
The performance of the models was evaluated using standard classification metrics:

- Accuracy
- Precision
- Recall
- F1-score
- Confusion Matrix

These metrics provide insights into how well the models detect fraudulent transactions while minimizing false positives.

---

## Technologies Used
The project was implemented using the following technologies and libraries:

- Python
- Pandas
- NumPy
- Scikit-learn
- Matplotlib
- Seaborn

These tools provide efficient support for data processing, machine learning model implementation, and data visualization.

---
## Authors
Swinburne University Vietnam  
COS30049 – Computing Technology Innovation Project

Team Members:

- Le Thanh Nam – 104999380  
- Huynh Ba Thanh – 105029615  
- Ho Cao Cuong – 105687343  
- Nguyen Hai Dang – 105680423

---

## References
- Dal Pozzolo et al., 2015 – Credit Card Fraud Detection  
- IEEE-CIS Fraud Detection Dataset (Kaggle)  
- PaySim Financial Fraud Dataset  
- Pedregosa et al., 2011 – Scikit-learn: Machine Learning in Python