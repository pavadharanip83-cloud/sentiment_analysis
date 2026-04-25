"""
backend/app.py  —  Flask REST API for Twitter Sentiment Analysis
Run: python app.py
"""
@app.route("/")
def home():
    return "Sentiment API is running 🚀"
from flask import Flask, request, jsonify
from flask_cors import CORS
import pickle, os, re, string, time
import numpy as np
import nltk

nltk.download('stopwords', quiet=True)
nltk.download('wordnet', quiet=True)
nltk.download('omw-1.4', quiet=True)

from nltk.corpus import stopwords
from nltk.stem import WordNetLemmatizer

app = Flask(__name__)
CORS(app)

# ── Preprocessing ─────────────────────────────────────────────────────────────
lemmatizer = WordNetLemmatizer()
stop_words  = set(stopwords.words('english'))
KEEP_WORDS  = {'not','no','nor','never',"don't","doesn't","didn't","won't","wouldn't","can't","couldn't","shouldn't"}
stop_words -= KEEP_WORDS

def clean_tweet(text: str) -> str:
    text = text.lower()
    text = re.sub(r'http\S+|www\S+', '', text)
    text = re.sub(r'@\w+', '', text)
    text = re.sub(r'#', '', text)
    text = re.sub(r'\brt\b', '', text)
    text = text.translate(str.maketrans('', '', string.punctuation))
    text = re.sub(r'\d+', '', text)
    tokens = text.split()
    tokens = [t for t in tokens if t not in stop_words and len(t) > 1]
    tokens = [lemmatizer.lemmatize(t) for t in tokens]
    return ' '.join(tokens)

# ── Load SVM model ────────────────────────────────────────────────────────────
MODEL_PATH = os.path.join(os.path.dirname(__file__), 'models', 'SVM_LinearSVC.pkl')
model_obj  = None

def load_model():
    global model_obj
    if os.path.exists(MODEL_PATH):
        with open(MODEL_PATH, 'rb') as f:
            model_obj = pickle.load(f)
        print(f"[OK] Model loaded from {MODEL_PATH}")
    else:
        print(f"[WARN] Model not found at {MODEL_PATH} — run train_model.py first")

load_model()

# ── Routes ────────────────────────────────────────────────────────────────────

@app.route('/api/health', methods=['GET'])
def health():
    return jsonify({'status': 'ok', 'model_loaded': model_obj is not None})


@app.route('/api/predict', methods=['POST'])
def predict():
    if not model_obj:
        return jsonify({'error': 'Model not loaded. Run train_model.py first.'}), 503

    data = request.get_json()
    tweet = data.get('tweet', '').strip()
    if not tweet:
        return jsonify({'error': 'No tweet provided'}), 400

    start    = time.time()
    clean    = clean_tweet(tweet)
    pipeline = model_obj['pipeline']
    le       = model_obj['label_encoder']

    pred_enc   = pipeline.predict([clean])[0]
    pred_proba = pipeline.predict_proba([clean])[0]
    label      = le.inverse_transform([pred_enc])[0]
    confidence = float(np.max(pred_proba))
    elapsed    = round((time.time() - start) * 1000, 1)

    proba_dict = {
        le.inverse_transform([i])[0]: round(float(p) * 100, 2)
        for i, p in enumerate(pred_proba)
    }

    return jsonify({
        'tweet'      : tweet,
        'clean_text' : clean,
        'sentiment'  : label,
        'confidence' : round(confidence * 100, 2),
        'probabilities': proba_dict,
        'elapsed_ms' : elapsed,
    })


@app.route('/api/predict/batch', methods=['POST'])
def predict_batch():
    if not model_obj:
        return jsonify({'error': 'Model not loaded'}), 503

    data   = request.get_json()
    tweets = data.get('tweets', [])
    if not tweets:
        return jsonify({'error': 'No tweets provided'}), 400

    pipeline = model_obj['pipeline']
    le       = model_obj['label_encoder']

    cleaned  = [clean_tweet(t) for t in tweets]
    preds    = le.inverse_transform(pipeline.predict(cleaned))
    probas   = pipeline.predict_proba(cleaned)

    results = []
    for i, tweet in enumerate(tweets):
        proba = probas[i]
        results.append({
            'tweet'     : tweet,
            'sentiment' : preds[i],
            'confidence': round(float(np.max(proba)) * 100, 2),
        })

    counts = {}
    for r in results:
        counts[r['sentiment']] = counts.get(r['sentiment'], 0) + 1

    return jsonify({'results': results, 'summary': counts, 'total': len(results)})

import os

if __name__ == '__main__':
    port = int(os.environ.get("PORT", 10000))
    app.run(host="0.0.0.0", port=port)
