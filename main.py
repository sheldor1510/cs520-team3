from flask import Flask, json, request
from twilio.twiml.messaging_response import MessagingResponse
from twilio.rest import Client
import urllib.request as urllib2
import os
from dotenv import load_dotenv

load_dotenv()

account_sid = 'ACbc22a3f36e9fd16021d3139f504987a8'
auth_token = os.environ.get('TWILIO_AUTH_TOKEN')
client = Client(account_sid, auth_token)

backend_url = 'http://localhost:3000' # Replace with your backend URL

def intro_message(sender_phone):
    message = client.messages.create(
        from_='whatsapp:+14155238886',
        content_sid='HX141777805ee7ebdb20216338433a78e6',
        to=sender_phone
    )

    print(message.sid)

def link_message(sender_phone):
    message = client.messages.create(
        from_='whatsapp:+14155238886',
        content_sid='HX5693ebba77c23045a56f41c876bc1ebe',
        to=sender_phone
    )

    print(message.sid)

action_to_prompt = {
    "bias_sentiment": "Analyze this link for an article <insert-link-here> for political or ideological bias. Evaluate the tone, sentiment, and framing. Identify any leanings (e.g., left-right, pro-con) and explain your reasoning briefly. Is the content balanced or skewed?. Keep the response under 1500 characters. Bold words are single asterisk *word*.",
    "source_credibility": "Check the credibility of the source for this article <insert-link-here>. Evaluate the author's expertise, the publication's reputation, and any potential biases. Provide a brief summary of your findings. Keep the response under 1500 characters. Bold words are single asterisk *word*.",
    "alternative_viewpoints": "Find alternative viewpoints for this article <insert-link-here>. Identify at least two different perspectives on the topic and provide a brief summary of each. Keep the response under 1500 characters. Bold words are single asterisk *word*.",
    "trending_misinformation": "Check for trending misinformation related to this article <insert-link-here>. Identify any viral falsehoods or misleading claims associated with the topic. Provide a brief summary of your findings. Keep the response under 1500 characters. Bold words are single asterisk *word*.",
    "media_consumption_summary": "Analyze the media consumption habits of the user based on the forwarded content. Identify any patterns or biases in the articles shared. Provide a brief summary of your findings. Keep the response under 1500 characters. Bold words are single asterisk *word*. <api-data>",
    "fact_checked_news_digest": "Provide a fact-checked news digest for the user. Analyze based on the topics of the articles they mostly reads about. Keep the response under 1500 characters. Bold words are single asterisk *word*. <api-data>",
    "topic_overview": "Provide an overview of the topic related to this article <insert-link-here>. Summarize the main points and key discussions surrounding the topic. Keep the response under 1500 characters. Bold words are single asterisk *word*.",
}

def process(action, link, sender_phone):
    print(f"Processing {action} for link: {link}")

    prompt = ""

    if action == "media_consumption_summary" or action == "fact_checked_news_digest":
        print("No link needed for this action.")
        link = ""
        data_from_api = ""

        if action == "media_consumption_summary":
            url = backend_url + "/userSummary"
            data = {
                "phoneNumber": global_stuff["user_phone"]
            }
            headers = {'Content-Type': 'application/json'}
            req = urllib2.Request(url, data=json.dumps(data).encode('utf-8'), headers=headers)
            response = urllib2.urlopen(req)
            response_data = response.read()
            response_json = json.loads(response_data)
            data_from_api = response_json['userSummary']
        else:
            url = backend_url + "/newsFeedDigest"
            data = {
                "phoneNumber": global_stuff["user_phone"]
            }
            headers = {'Content-Type': 'application/json'}
            req = urllib2.Request(url, data=json.dumps(data).encode('utf-8'), headers=headers)
            response = urllib2.urlopen(req)
            response_data = response.read()
            response_json = json.loads(response_data)
            data_from_api = response_json['recommendedTopics']

        prompt = action_to_prompt[action].replace("<api-data>", data_from_api)
    else:
        prompt = action_to_prompt[action].replace("<insert-link-here>", link)

    url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=" + os.environ.get('GEMINI_API_KEY')
    data = {
        "contents": [{
            "parts":[{"text": prompt }],
        }]
    }
    headers = {'Content-Type': 'application/json'}
    req = urllib2.Request(url, data=json.dumps(data).encode('utf-8'), headers=headers)
    response = urllib2.urlopen(req)
    response_data = response.read()
    print("Response from processing:", response_data)
    response_json = json.loads(response_data)
    text = response_json['candidates'][0]['content']['parts'][0]['text']

    if action != "media_consumption_summary" and action != "fact_checked_news_digest":
        url = backend_url + "/addInteraction"
        data = {
            "userPhoneNumber": global_stuff["user_phone"],
            "prompt": action_to_prompt[action],
            "result": text,
            "link": link
        }
        headers = {'Content-Type': 'application/json'}
        req = urllib2.Request(url, data=json.dumps(data).encode('utf-8'), headers=headers)
        response = urllib2.urlopen(req)
        response_data = response.read()
        print("Response from /addInteraction:", response_data)
        

    message = client.messages.create(
        from_='whatsapp:+14155238886',
        body=text,
        to=sender_phone
    )

    print(message.sid)

global_stuff = {
    "last_link_provided": "",
    "user_name": "",
    "user_phone": "",
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
        link_message(sender_phone)
    else:
        if global_stuff["user_name"] == "":
            if global_stuff["user_phone"] == "":
                intro_message(sender_phone)
                global_stuff["user_phone"] = sender_phone
            else:
                global_stuff["user_name"] = user_msg

                url = backend_url + "/addUser"
                data = {
                    "name": global_stuff["user_name"],
                    "phoneNumber": global_stuff["user_phone"]
                }

                headers = {'Content-Type': 'application/json'}
                req = urllib2.Request(url, data=json.dumps(data).encode('utf-8'), headers=headers)
                response = urllib2.urlopen(req)
                response_data = response.read()
                response_json = json.loads(response_data)
                print("Response from /addUser:", response_json)

                reply = f"Hello {user_msg.title()}! Please provide a link to an article you want to analyze."
        else:
            reply = "Please provide a valid link for an article."

    response = MessagingResponse()
    response.message(reply)

    return str(response)


if __name__ == "__main__":
	app.run(port=9000, debug=True)
