"""
backend/train_model.py  —  Train SVM model for Twitter Sentiment Analysis
Usage: python train_model.py --data dataset.csv --text_col text --label_col sentiment
"""

import argparse, os, pickle, warnings
warnings.filterwarnings('ignore')

import pandas as pd
import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt

from sklearn.model_selection import train_test_split
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.pipeline import Pipeline
from sklearn.svm import LinearSVC
from sklearn.calibration import CalibratedClassifierCV
from sklearn.preprocessing import LabelEncoder
from sklearn.metrics import (
    accuracy_score, classification_report,
    confusion_matrix, ConfusionMatrixDisplay
)

import re, string, nltk
nltk.download('stopwords', quiet=True)
nltk.download('wordnet', quiet=True)
nltk.download('omw-1.4', quiet=True)
from nltk.corpus import stopwords
from nltk.stem import WordNetLemmatizer

lemmatizer = WordNetLemmatizer()
stop_words  = set(stopwords.words('english'))
KEEP_WORDS  = {'not','no','nor','never'}
stop_words -= KEEP_WORDS

def clean_tweet(text):
    text = str(text).lower()
    text = re.sub(r'http\S+|www\S+', '', text)
    text = re.sub(r'@\w+', '', text)
    text = re.sub(r'#', '', text)
    text = re.sub(r'\brt\b', '', text)
    text = text.translate(str.maketrans('', '', string.punctuation))
    text = re.sub(r'\d+', '', text)
    tokens = [lemmatizer.lemmatize(t) for t in text.split()
              if t not in stop_words and len(t) > 1]
    return ' '.join(tokens)

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--data',       default='Sentiment.csv')
    parser.add_argument('--text_col',   default='text')
    parser.add_argument('--label_col',  default='sentiment')
    parser.add_argument('--test_size',  default=0.2, type=float)
    parser.add_argument('--output_dir', default='models')
    args = parser.parse_args()

    os.makedirs(args.output_dir, exist_ok=True)

    print(f"[INFO] Loading {args.data} ...")
    df = pd.read_csv(args.data, encoding='latin-1')
    df = df[[args.text_col, args.label_col]].dropna()
    print(f"[INFO] {len(df):,} rows | Labels: {df[args.label_col].value_counts().to_dict()}")

    print("[INFO] Preprocessing tweets ...")
    df['clean'] = df[args.text_col].apply(clean_tweet)

    le = LabelEncoder()
    y  = le.fit_transform(df[args.label_col])
    X  = df['clean']

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=args.test_size, random_state=42, stratify=y
    )
    print(f"[INFO] Train: {len(X_train):,}  Test: {len(X_test):,}")

    pipeline = Pipeline([
        ('tfidf', TfidfVectorizer(
            max_features=75_000,
            ngram_range=(1, 3),
            sublinear_tf=True,
            min_df=2,
            max_df=0.92,
        )),
        ('clf', CalibratedClassifierCV(
            LinearSVC(C=1.0, max_iter=3000), cv=3
        )),
    ])

    print("[INFO] Training SVM ...")
    pipeline.fit(X_train, y_train)

    y_pred = pipeline.predict(X_test)
    acc    = accuracy_score(y_test, y_pred)

    print(f"\n{'='*50}")
    print(f"  SVM Accuracy: {acc*100:.2f}%")
    print(f"{'='*50}")
    print(classification_report(y_test, y_pred, target_names=le.classes_))

    # Confusion matrix
    cm   = confusion_matrix(y_test, y_pred)
    disp = ConfusionMatrixDisplay(cm, display_labels=le.classes_)
    fig, ax = plt.subplots(figsize=(6, 5))
    disp.plot(ax=ax, cmap='Blues', colorbar=False)
    ax.set_title(f'SVM Confusion Matrix  |  Accuracy: {acc*100:.2f}%')
    plt.tight_layout()
    plt.savefig(os.path.join(args.output_dir, 'confusion_matrix.png'), dpi=150)
    plt.close()

    # Save model
    model_path = os.path.join(args.output_dir, 'SVM_LinearSVC.pkl')
    with open(model_path, 'wb') as f:
        pickle.dump({'pipeline': pipeline, 'label_encoder': le, 'accuracy': acc}, f)

    # Save stats JSON for frontend
    import json
    stats = {
        'accuracy': round(acc * 100, 2),
        'classes' : le.classes_.tolist(),
        'train_size': len(X_train),
        'test_size' : len(X_test),
    }
    with open(os.path.join(args.output_dir, 'stats.json'), 'w') as f:
        json.dump(stats, f)

    print(f"\n[SAVED] Model → {model_path}")
    print(f"[DONE]  Accuracy: {acc*100:.2f}%")

if __name__ == '__main__':
    main()
