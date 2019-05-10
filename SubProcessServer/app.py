from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
from sub_process import SubProcessHandler

app = Flask(__name__)
CORS(app)

@app.route('/', methods=['GET', 'POST'])
def handle():
    if request.method == 'POST':
        aws_script = request.form['aws_script']
        user_script = request.form['user_script']

        print(aws_script)
        print(user_script)

        handler = SubProcessHandler(aws_script, user_script)

        script = handler.get_srt()

        return script
    else:
        return "Access Denied"


if __name__ == "__main__":
    app.run(host='0.0.0.0', port='80')