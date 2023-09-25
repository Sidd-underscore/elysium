import pickle
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression

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

def load_model(model_file):
    with open(model_file, "rb") as f:
        chatbot = pickle.load(f)
    return chatbot

chatbot = load_model("chatbot.model")

while True:
    message = input("You: ")
    response = chatbot.predict(message)
    print("Chatbot:", response)
