from flask import Flask, json, request
from twilio.twiml.messaging_response import MessagingResponse
from twilio.rest import Client
import os
from dotenv import load_dotenv

load_dotenv()

account_sid = 'ACbc22a3f36e9fd16021d3139f504987a8'
auth_token = os.environ.get('TWILIO_AUTH_TOKEN')
client = Client(account_sid, auth_token)

def initial_message(sender_phone):
    message = client.messages.create(
        from_='whatsapp:+14155238886',
        content_sid='HX041b223d999db074d59bfc72e16cb1b2',
        to=sender_phone
    )

    print(message.sid)

def process(action, link, sender_phone):
    text = f"Processing {action} for link: {link}"

    message = client.messages.create(
        from_='whatsapp:+14155238886',
        body=text,
        to=sender_phone
    )

    print(message.sid)

global_stuff = {
    "last_link_provided": "",
    "option_selected": "",
    "bias_sentiment": "",
    "source_credibility": "",
    "alternative_viewpoints": "",
    "trending_misinformation": "",
    "media_consumption_summary": "",
    "fact_checked_news_digest": "",
    "topic_overview": "",
}

app = Flask(__name__)

@app.route("/", methods=["POST"])

def bot():
    id_to_action = {
        '1': "bias_sentiment",
        '2': "source_credibility",
        '3': "alternative_viewpoints",
        '4': "trending_misinformation",
        '5': "media_consumption_summary",
        '6': "fact_checked_news_digest",
        '7': "topic_overview",
    }

    user_msg = request.values.get('Body', '').lower()
    sender_phone = request.values.get('From', '')

    reply = ""
    if user_msg.isdigit():
        print("User selected option: ", id_to_action[user_msg])
        print("Link to perform action on: ", global_stuff["last_link_provided"])
        reply = "Here's what I could find and analyze for you.\n\n"
        process(id_to_action[user_msg], global_stuff["last_link_provided"], sender_phone)
    elif "http://" in user_msg or "https://" in user_msg or "www." in user_msg:
        link = ""
        for word in user_msg.split():
            if "http://" in word or "https://" in word or "www." in word:
                link = word
                break
        reply = "Please choose an option that you want to perform on the article link you provided.\n\n"
        global_stuff["last_link_provided"] = link
        initial_message(sender_phone)
    else:
        reply = "Please provide a valid link for an article."

    response = MessagingResponse()
    response.message(reply)

    return str(response)


if __name__ == "__main__":
	app.run(port=9000, debug=True)
