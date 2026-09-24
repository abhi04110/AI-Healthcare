# AI Healthcare Risk & Patient Analytics System

An AI-powered healthcare analytics backend built with FastAPI, PostgreSQL, Machine Learning, OCR, Clustering, and LangChain-based AI assistance.

The system is designed to transform patient data into actionable healthcare intelligence through secure patient management, medical report processing, health risk prediction, patient segmentation, analytics, and an AI healthcare assistant.

## Project Objective

Healthcare systems generate large amounts of patient information such as:

- Patient demographics
- Medical history
- Health measurements
- Medical reports
- Laboratory results
- Risk predictions

Managing and analyzing this information manually can be time-consuming.

This project provides a centralized backend system that can:

- Manage patient information
- Store health records
- Upload medical reports
- Extract text using OCR
- Extract useful medical values
- Train a machine learning risk model
- Predict health risk from patient records
- Segment patients using clustering algorithms
- Detect statistical outliers
- Generate healthcare analytics
- Answer natural-language questions using an AI assistant

## Main Features

### 1. Authentication

The system provides JWT-based authentication with password hashing.

Supported roles:

- Admin
- Doctor
- Staff

Authentication features include:

- User registration
- User login
- JWT access tokens
- Current user profile
- Role-based access control
- Password hashing
- Patient ownership protection

## 2. Patient Management

Healthcare staff can manage patient records.

Patient information includes:

- Patient code
- Name
- Age
- Gender
- Phone
- Address
- Medical history

Supported operations:

- Create patient
- View patients
- View individual patient
- Update patient
- Delete patient

## 3. Health Records

The system stores structured health measurements for patients.

Current health features include:

- Glucose
- Blood pressure
- BMI
- Cholesterol
- Heart rate

Each health record is linked to a patient and can be used by the analytics and machine learning modules.

## 4. Medical Report Management

Medical reports can be uploaded and stored against a patient.

Supported report formats include:

- PNG
- JPG
- JPEG
- PDF

The system stores:

- File name
- File type
- File path
- Extracted text
- Patient relationship
- Upload timestamp

## 5. OCR

Medical report text can be extracted using OCR.

Technologies used:

- Tesseract OCR
- Pytesseract
- Pillow
- PyPDF

The system can extract structured values from supported medical report text, including values such as:

- Hemoglobin
- WBC
- RBC
- Platelets
- ALT
- AST
- Bilirubin
- Albumin
- Creatinine
- Urea
- Uric acid
- TSH
- Glucose
- BMI
- Cholesterol
- Heart rate
- Blood pressure

OCR-extracted information should be reviewed by healthcare staff before clinical use.

## 6. Machine Learning Risk Prediction

The system uses a Random Forest Classifier for health risk classification.

The model uses:

- Age
- Glucose
- Blood pressure
- BMI
- Cholesterol
- Heart rate

Risk classes:

- Low
- Medium
- High

The model is trained using labelled health records stored in PostgreSQL.

The training workflow includes:

1. Reading labelled health records from PostgreSQL
2. Validating the training data
3. Splitting data into training and testing sets
4. Training a Random Forest model
5. Evaluating the model
6. Saving the trained model
7. Using the model for future predictions

The project includes synthetic/demo labelled records for development and demonstration.

These labels are not clinical ground truth.

## 7. Patient Risk Prediction

The system supports prediction directly from a patient's latest health record.

Workflow:

1. Select patient
2. Fetch latest complete health record
3. Send health data to the trained ML model
4. Generate risk classification
5. Calculate prediction confidence
6. Store the prediction in PostgreSQL
7. Return prediction details

Prediction history is also maintained.

## 8. Patient Clustering

The system provides unsupervised patient segmentation using:

- K-Means
- DBSCAN
- Hierarchical Clustering

Clustering uses:

- Age
- Glucose
- Blood pressure
- BMI
- Cholesterol
- Heart rate

Before clustering, numerical features are standardized using `StandardScaler`.

The clustering module works with patient data stored in PostgreSQL.

## 9. Healthcare Analytics

The analytics module provides:

- Total patients
- Total health records
- Average age
- Average glucose
- Average blood pressure
- Average BMI
- Average cholesterol
- Average heart rate
- Risk distribution
- Statistical outlier detection

Outlier detection uses the Interquartile Range (IQR) method.

## 10. Patient Timeline

Each patient has a combined timeline containing:

- Patient information
- Health records
- Medical reports
- Risk predictions

This provides a centralized view of the patient's available healthcare data.

## 11. AI Healthcare Assistant

The system includes a natural-language AI healthcare assistant built using LangChain.

The assistant can answer questions such as:

- "Anuj ki latest health information batao"
- "Patient 1 ki reports batao"
- "How many patients are there?"
- "Which patients have high risk predictions?"
- "What is the average glucose level?"

The assistant identifies patients from the user's natural-language question instead of requiring a separate patient ID field.

Supported AI providers:

- Google Gemini
- Groq

The system also supports automatic provider fallback.

For example:

```text
Auto
   |
   v
Gemini
   |
   | failure
   v
Groq