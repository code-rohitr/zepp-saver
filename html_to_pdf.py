#!/usr/bin/env python3
"""
Convert HTML to PDF using weasyprint
Run: python3 html_to_pdf.py
"""

try:
    from weasyprint import HTML, CSS
    import os
    
    # Get the current directory
    current_dir = os.path.dirname(os.path.abspath(__file__))
    html_file = os.path.join(current_dir, 'CHROME_STORE_DESCRIPTION.html')
    pdf_file = os.path.join(current_dir, 'CHROME_STORE_DESCRIPTION.pdf')
    
    # Convert HTML to PDF
    HTML(filename=html_file).write_pdf(pdf_file)
    print(f"✅ PDF created successfully: {pdf_file}")
    
except ImportError:
    print("❌ weasyprint not installed. Trying alternative method...")
    
    try:
        import pdfkit
        import os
        
        current_dir = os.path.dirname(os.path.abspath(__file__))
        html_file = os.path.join(current_dir, 'CHROME_STORE_DESCRIPTION.html')
        pdf_file = os.path.join(current_dir, 'CHROME_STORE_DESCRIPTION.pdf')
        
        # Convert HTML to PDF using pdfkit
        pdfkit.from_file(html_file, pdf_file)
        print(f"✅ PDF created successfully: {pdf_file}")
        
    except ImportError:
        print("❌ pdfkit not installed either. Please install one of the following:")
        print("   pip install weasyprint")
        print("   pip install pdfkit")
        
        print("\n📝 Alternative: Open CHROME_STORE_DESCRIPTION.html in your browser and print to PDF")
        
except Exception as e:
    print(f"❌ Error creating PDF: {e}")
    print("📝 Alternative: Open CHROME_STORE_DESCRIPTION.html in your browser and print to PDF")