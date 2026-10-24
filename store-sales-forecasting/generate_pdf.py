import os
from datetime import datetime
from fpdf import FPDF
from fpdf.enums import XPos, YPos

class ReportPDF(FPDF):
    def header(self):
        # Don't add header on the first (cover) page
        if self.page_no() > 1:
            self.set_font('Helvetica', 'I', 8)
            self.set_text_color(128, 128, 128)
            self.cell(0, 10, 'Project Technical Report', new_x=XPos.RIGHT, new_y=YPos.TOP, align='L')
            self.cell(0, 10, datetime.now().strftime("%B %d, %Y"), new_x=XPos.LMARGIN, new_y=YPos.NEXT, align='R')
            self.line(10, 20, 200, 20)
            self.ln(5)

    def footer(self):
        # Position at 1.5 cm from bottom
        self.set_y(-15)
        # Helvetica italic 8
        self.set_font('Helvetica', 'I', 8)
        self.set_text_color(128, 128, 128)
        # Page number
        self.cell(0, 10, f'Page {self.page_no()}', new_x=XPos.RIGHT, new_y=YPos.TOP, align='C')

    def cover_page(self, title, subtitle):
        self.add_page()
        self.set_font('Helvetica', 'B', 24)
        self.set_text_color(0, 51, 102) # Dark blue
        self.ln(50)
        self.cell(0, 10, title, new_x=XPos.LMARGIN, new_y=YPos.NEXT, align='C')
        self.ln(10)
        
        self.set_font('Helvetica', 'I', 16)
        self.set_text_color(100, 100, 100)
        self.cell(0, 10, subtitle, new_x=XPos.LMARGIN, new_y=YPos.NEXT, align='C')
        self.ln(40)
        
        self.set_font('Helvetica', '', 12)
        self.set_text_color(0, 0, 0)
        self.cell(0, 10, 'Prepared for: Project Stakeholders', new_x=XPos.LMARGIN, new_y=YPos.NEXT, align='C')
        self.cell(0, 10, f'Date: {datetime.now().strftime("%B %d, %Y")}', new_x=XPos.LMARGIN, new_y=YPos.NEXT, align='C')
        self.add_page()

    def chapter_title(self, num, title):
        self.set_font('Helvetica', 'B', 16)
        self.set_text_color(0, 51, 102) # Dark blue
        self.cell(0, 10, f'{num}. {title}', new_x=XPos.LMARGIN, new_y=YPos.NEXT, align='L')
        self.line(self.get_x(), self.get_y(), 200, self.get_y())
        self.ln(5)

    def sub_title(self, title):
        self.set_font('Helvetica', 'B', 12)
        self.set_text_color(0, 0, 0)
        self.cell(0, 8, title, new_x=XPos.LMARGIN, new_y=YPos.NEXT, align='L')
        self.ln(2)

    def chapter_body(self, body):
        self.set_font('Times', '', 11)
        self.set_text_color(0, 0, 0)
        self.multi_cell(0, 7, body)
        self.ln(5)

    def bullet_point(self, label, text):
        self.set_font('Helvetica', 'B', 11)
        self.cell(10, 7, "-", new_x=XPos.RIGHT, new_y=YPos.TOP, align='R')
        self.set_font('Times', 'B', 11)
        self.write(7, f"{label}: ")
        self.set_font('Times', '', 11)
        self.multi_cell(0, 7, text)
        self.ln(2)

pdf = ReportPDF()
pdf.set_auto_page_break(auto=True, margin=20)

# Cover Page
pdf.cover_page("Store Sales Forecasting", "Technical Project Report & Architecture Overview")

# Section 1: Executive Summary
pdf.chapter_title(1, 'Executive Summary')
exec_summary = (
    "This technical report outlines the objectives, architecture, and technology stack for the Store Sales "
    "Forecasting project. The primary goal of this system is to build a robust and highly scalable machine "
    "learning pipeline capable of accurately predicting future sales across various store items, item families, "
    "and retail locations. By leveraging modern MLOps practices, the project ensures continuous integration, "
    "automated forecasting, and high-availability endpoints."
)
pdf.chapter_body(exec_summary)

# Section 2: Project Objectives
pdf.chapter_title(2, 'Project Objectives')
pdf.sub_title("Core Business & Technical Goals")
pdf.chapter_body("The implementation of this project aims to achieve several critical business and operational goals:")

pdf.bullet_point("Demand Forecasting", "Predict future sales over a specific horizon based on historical transaction data, enabling optimized inventory management and reducing stockouts or overstock scenarios.")
pdf.bullet_point("Pattern Recognition", "Automatically identify complex seasonality patterns, long-term trends, and the measurable impact of external factors such as local holidays and promotional campaigns.")
pdf.bullet_point("Automated Machine Learning Pipeline", "Implement an end-to-end operational ML pipeline that encompasses automated data ingestion, advanced preprocessing, model training, and continuous prediction generation.")
pdf.bullet_point("Scalable Model Deployment", "Serve the trained machine learning models via a highly scalable, low-latency RESTful API, facilitating seamless integration with internal dashboards or frontend applications.")
pdf.bullet_point("Reproducibility & Governance", "Ensure that all model experiments, datasets, and hyperparameters are meticulously tracked and versioned using state-of-the-art MLOps tooling.")

# Section 3: Technology Stack Architecture
pdf.chapter_title(3, 'Technology Stack & Architecture')
pdf.chapter_body("The project architecture leverages a modern, Python-centric Data Science and Machine Learning Operations (MLOps) stack, specifically selected for handling high-volume time-series data.")

pdf.sub_title("Machine Learning & Data Processing")
pdf.bullet_point("Python 3", "The core programming language orchestrating data pipelines and API services.")
pdf.bullet_point("Pandas & NumPy", "Essential libraries used for high-performance data manipulation, cleaning, and sophisticated feature engineering.")
pdf.bullet_point("LightGBM & Scikit-learn", "High-performance, distributed gradient boosting frameworks utilized for training the predictive regression models.")
pdf.bullet_point("Darts", "A specialized Python library that provides user-friendly and advanced forecasting algorithms explicitly designed for multivariate time-series.")
pdf.bullet_point("Hampel", "A robust filtering algorithm used for reliable outlier detection and removal in volatile time-series datasets.")

pdf.sub_title("API Infrastructure & Deployment")
pdf.bullet_point("FastAPI", "A modern, high-performance web framework used for building the prediction REST APIs.")
pdf.bullet_point("Uvicorn", "A lightning-fast ASGI web server implementation serving the FastAPI endpoints.")
pdf.bullet_point("Docker", "Containerization technology ensuring absolute consistency across local, staging, and production environments.")

pdf.sub_title("MLOps & Data Versioning")
pdf.bullet_point("DVC (Data Version Control)", "An essential tool utilized to version massive datasets and strictly track machine learning models and experiments.")
pdf.bullet_point("Joblib", "Employed for serializing and efficiently saving/loading the trained LightGBM model artifacts.")

pdf.sub_title("Database & Storage")
pdf.bullet_point("PyMongo", "The MongoDB driver for Python, architected to store raw sales records, system telemetry, application logs, and historical prediction data.")

# Section 4: Conclusion
pdf.chapter_title(4, 'Conclusion & Next Steps')
conclusion = (
    "The chosen technology stack and architectural design present a highly capable foundation for enterprise-scale "
    "time-series forecasting. The combination of LightGBM and Darts offers unparalleled accuracy for sales predictions, "
    "while FastAPI and Docker guarantee that the system can scale to meet real-time production demands. "
    "The integration of DVC ensures that the project remains maintainable, reproducible, and ready for future iterations."
)
pdf.chapter_body(conclusion)


output_path = 'Professional_Project_Report.pdf'
pdf.output(output_path)
print(f"PDF successfully generated at: {os.path.abspath(output_path)}")
