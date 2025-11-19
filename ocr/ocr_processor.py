import boto3
import fitz
import pytesseract
from PIL import Image
import io
import csv

def extract_text_from_s3(s3_client, s3_bucket_name, key):
    """ S3 KEY를 받아, 확장자에 따라 텍스트를 추출하는 함수"""

    try:
        
        # 1. S3에서 파일을 다운
        obj = s3_client.get_object(Bucket=s3_bucket_name, Key=key)
        file_bytes = obj['Body'].read()

        file_name = key.split('/')[-1]
        ext = "." + key.split('.')[-1].lower()

        # 2. LLM이 구별할 수 있도록 머리말
        text_header = f"\n\n--- [첨부파일: {file_name} 내용] ---\n"
        extracted_text = ""

        # 3. 확장자에 따라 처리
        if ext in [ '.jpg', '.jpeg', '.png']:
            image = Image.open(io.BytesIO(file_bytes))
            extracted_text = pytesseract.image_to_string(image, lang='eng+kor')
        elif ext == '.pdf':
            with fitz.open(stream=file_bytes, filetype="pdf") as doc:
                for page in doc:
                    extracted_text += page.get_text()
        elif ext == '.csv':
            decoded_file = file_bytes.decode('utf-8').splitlines()
            reader = csv.reader(decoded_file)
            for row in reader:
                extracted_text += ', '.join(row) + '\n'
        elif ext == '.txt':
            extracted_text = file_bytes.decode('utf-8')
        else:
            extracted_text = "[지원하지 않는 파일 형식입니다.]"

        return text_header + extracted_text


    except Exception as e:
        print(f"S3에서 파일을 가져오는 중 오류 발생: {e}")
        return f"\n\n--- [파일 처리 오류: {key.split('/')[-1]}] ---\n{e}\n"