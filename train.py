import json
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
import pickle

class Chatbot:
    def __init__(self, training_data):
        self.training_data = training_data
        self.vectorizer = TfidfVectorizer()
        self.classifier = LogisticRegression()

    def train(self):
        # Load the training data
        X_train = []
        y_train = []
        for message in self.training_data:
            X_train.append(message["message"])
            y_train.append(message["response"])

        # Vectorize the training data
        X_train_vectorized = self.vectorizer.fit_transform(X_train)

        # Train the classifier
        self.classifier.fit(X_train_vectorized, y_train)

    def predict(self, message):
        # Vectorize the input message
        message_vectorized = self.vectorizer.transform([message])

        # Predict the response
        response = self.classifier.predict_proba(message_vectorized)[0]

        # Find the most probable response
        max_index = np.argmax(response)
        most_probable_response = self.training_data[max_index]["response"]

        # Return the response
        return most_probable_response

def load_training_data(json_file):
    with open(json_file, "r", encoding="utf-8") as f:
        training_data = json.load(f)
    return training_data

def save_model(chatbot, model_file):
    with open(model_file, "wb") as f:
        pickle.dump(chatbot, f)

# Load the training data
training_data = load_training_data("trainMessages.json")

# Train the chatbot
chatbot = Chatbot(training_data)
chatbot.train()

# Save the model
save_model(chatbot, "chatbot.model")