import json
import re

class SubProcessHandler:

    PUNCTUATIONS = '.?_/,!<>(){}[]-:;'
    WORD_TIME = 0.5
    EARLY_START = 0.5
    MAX_SECTION_WORDS = 10

    def __init__(self, aws_script, user_script):
        self.aws_script = aws_script
        self.user_script = user_script
    
    def str_a_in_b(self, a, b):
        #return re.search(a, b, re.IGNORECASE) or re.search(b, a, re.IGNORECASE)
        a_lower = a.lower()
        b_lower = b.lower()
        return a_lower.find(b_lower) != -1 or b_lower.find(a_lower) != -1

    def standardlize(self, string):
        while (string.find('  ') != -1):
            string = string.replace(' ')
        return string

    def extract_from_user_transcript(self, transcript):  
        if len(transcript) == 0:
            return []      
        transcript = transcript.split('\n')
        for i in range(0, len(transcript)-1):
            transcript[i] += '\n'
        result = []
        for line in transcript:
            line = line
            line = line.split(' ')
            for word in line:
                result.append(word)
        return result

    def word_with_timestamp(self, item):
        best_id = 0
        for i in range(1, len(item['alternatives'])):
            if item['alternatives'][i]['confidence'] > item['alternatives'][best_id]['confidence']:
                best_id = i
        content = item['alternatives'][best_id]['content']
        start = float(item['start_time'])
        end = float(item['end_time'])
        return (content, (start, end))

    def extract_from_json(self, response):

        res = []
        response = json.loads(response)
        # print(response["results"])
        items = response['results']['items']
        
        for item in items:
            if (item['type'] != 'punctuation'):
                res.append(self.word_with_timestamp(item))
        return res

    def srt_time_format(self, time):
        sec = int(time)
        ms = int((time - sec) * 1000)
        hh = sec / 3600
        mm = (sec % 3600) / 60
        ss = sec % 60

        return "%02d:%02d:%02d,%003d" % (hh, mm, ss, ms)

    def sections_to_srt(self, sections):
        seq = []
        for section in sections:
            string = ""
            string = self.srt_time_format(section[1][0]) + " --> " + self.srt_time_format(section[1][1]) + "\n"
            string += section[0] + "\n"
            if (section[0][-1] != '\n'):
                string +=  "\n"
            seq.append(string)
        srt = ""
        for i in range(len(seq)):
            srt += str(i+1) + "\n"
            srt += seq[i]
        return srt

    def finalize_section(self, sections, idx):
        section = sections[idx]
        l = None
        r = None
        for i in range(len(section)):
            if section[i][1] != (-1, -1):
                if l == None:
                    l = i
                r = i
        if (l != None):
            start_time = section[l][1][0] - self.WORD_TIME*l - self.EARLY_START
            end_time = section[r][1][1] + self.WORD_TIME * (len(section) - 1 - r)
        else:
            if len(sections) <= 1:
                return ("", (0, 0))
            if (idx == 0):
                start_time = 0
                end_time = self.WORD_TIME * len(section)
            else:
                start_time = sections[idx-1][-1][1][1]
                #print(sections[idx-1][-1][1][1])
                end_time = start_time + self.WORD_TIME * len(section)

        #print(idx, start_time, end_time)
                
        string = ""
        for item in section:
            string = string + ' ' + item[0]
        return (string, (start_time, end_time))

    def split_into_sections(self, trans_timestamp):
        print(trans_timestamp)
        sections = []
        l = 0
        r = 0
        while (r < len(trans_timestamp)):
            print(trans_timestamp, r)
            if trans_timestamp[r][0][-1] == '\n' or (r - l + 1 == self.MAX_SECTION_WORDS):
                sections.append(trans_timestamp[l:r+1])
                l = r+1
                r = r+1
            else:
                r += 1
        if (l <= r):
            sections.append(trans_timestamp[l:r])

        sequences = []

        for i in range(len(sections)):
            sequences.append(self.finalize_section(sections, i))

        return sequences
            

    def LCS_user_aws(self, user_trans, aws_trans_with_time):
        
        print("dm", user_trans)
        if len(user_trans) == 0:
            sequences = self.split_into_sections(aws_trans_with_time)
            return self.sections_to_srt(sequences)

        aws_trans = []
        for item in aws_trans_with_time:
            aws_trans.append(item[0])

    #    print(aws_trans)

        m = len(user_trans)
        n = len(aws_trans)

        L = [[0 for x in range(n+1)] for x in range(m+1)] 

        for i in range(m+1): 
            for j in range(n+1): 
                if i == 0 or j == 0: 
                    L[i][j] = 0
                elif self.str_a_in_b(aws_trans[j-1], user_trans[i-1]): 
                    L[i][j] = L[i-1][j-1] + 1
                else: 
                    L[i][j] = max(L[i-1][j], L[i][j-1])

        index = L[m][n] 
        lcs = [""] * (index) 
        
        i = m 
        j = n

        while i > 0 and j > 0: 
            if self.str_a_in_b(aws_trans[j-1], user_trans[i-1]): 
                lcs[index-1] = (i-1, j-1)
                i -= 1
                j -= 1
                index -= 1
            elif L[i-1][j] > L[i][j-1]: 
                i -= 1
            else:
                j -= 1

        user_trans_with_time = []
        for word in user_trans:
            user_trans_with_time.append( (word, (-1, -1)) )

        for pair in lcs:
            i = pair[0]
            j = pair[1]
            #print(i, user_trans[i], aws_trans[j])
            user_trans_with_time[i] = (user_trans_with_time[i][0], aws_trans_with_time[j][1])

        sequences = self.split_into_sections(user_trans_with_time)
        return self.sections_to_srt(sequences)
        #for i in range(len(user_trans_with_time)):
        #   print(i, user_trans_with_time[i])

    def get_srt(self):
        user_transcript = self.extract_from_user_transcript(self.user_script)
        aws_transcript = self.extract_from_json(self.aws_script)
        print(aws_transcript)
        #print(user_transcript)
        srt_content = self.LCS_user_aws(user_transcript, aws_transcript)
        return srt_content
