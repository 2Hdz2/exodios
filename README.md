```markdown
# Exoplanet Detection System

A data-driven exoplanet detection platform that combines machine learning with an interactive web interface. The system is designed to analyze astrophysical light curve data, identify exoplanet transit signals, and provide an accessible frontend for visualization, model interaction, and candidate review.

## Overview

This project uses AI to detect exoplanet signals from observational data such as light curves and transit photometry. It includes:

- A backend service for preprocessing, model training, inference, and data storage
- A frontend UI for visualizing light curves, classification results, and candidate metadata
- A modular structure for easy extension into new datasets and model architectures
- Tools to evaluate model performance and inspect results

The system aims to identify exoplanet candidates by recognizing periodic dips in stellar brightness caused by a planet passing in front of its host star.

## Tech Stack

- Python
  - Data processing and cleaning
  - Model training and inference
  - API backend
- JavaScript / React
  - Interactive frontend dashboard
  - Data visualization components
- FastAPI / Flask
  - REST API for model endpoints and data access
- npm / Yarn
  - Frontend dependency management and build tooling
- scikit-learn / TensorFlow / PyTorch
  - Machine learning and deep learning model support

## Folder Structure

A typical repository layout:

- `backend/`
  - Model training code
  - Data preprocessing pipelines
  - API server implementation
- `frontend/`
  - React application
  - Visualization and dashboard components
- `data/`
  - Raw observation data
  - Processed datasets ready for training
- `models/`
  - Trained model artifacts
  - Model configuration files
- `scripts/`
  - Utility scripts for preprocessing, evaluation, and dataset generation
- `README.md`
  - Project documentation

## What the System Does

- Loads raw astrophysical observation files
- Cleans and normalizes light curves
- Extracts features and constructs training datasets
- Trains classification models to distinguish exoplanet transits from noise
- Serves inference endpoints for new observations
- Visualizes results on a frontend dashboard
- Stores candidate predictions and relevant metrics

## Setup Instructions

1. Clone the repository:
   - `git clone https://github.com/your-org/exo-detection.git`
   - `cd exo-detection`

2. Backend environment:
   - `cd backend`
   - Create a virtual environment:
     - `python -m venv .venv`
   - Activate it:
     - `.\.venv\Scripts\activate`
   - Install dependencies:
     - `pip install -r requirements.txt`

3. Frontend environment:
   - `cd frontend`
   - Install packages:
     - `npm install`

## Running the Backend

From `backend/`:

- Start the API server:
  - `python app.py`
- Or if using FastAPI:
  - `uvicorn app:app --reload`

## Running the Frontend

From `frontend/`:

- Start the development server:
  - `npm start`
- Build for production:
  - `npm run build`


## Author

Heidi Erin K.
```