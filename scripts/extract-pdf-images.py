#!/usr/bin/env python3
"""
Extract images from a Kaizen quickstart PDF guide.

Usage:
    python extract-pdf-images.py <pdf_path> [--output-dir <dir>]

Example:
    python extract-pdf-images.py ../kaizen-v3/docs/kaizen-quickstart.pdf
"""

import argparse
import sys
from pathlib import Path

try:
    import fitz  # PyMuPDF
except ImportError:
    print("Error: PyMuPDF is required. Install it with:")
    print("  pip install PyMuPDF")
    sys.exit(1)


def extract_images_from_pdf(pdf_path: Path, output_dir: Path):
    """Extract all images from a PDF file."""
    pdf_path = Path(pdf_path).resolve()
    output_dir = Path(output_dir).resolve()
    
    if not pdf_path.exists():
        print(f"Error: PDF file not found: {pdf_path}")
        sys.exit(1)
    
    # Create output directory if it doesn't exist
    output_dir.mkdir(parents=True, exist_ok=True)
    
    print(f"Opening PDF: {pdf_path}")
    print(f"Output directory: {output_dir}")
    print()
    
    doc = fitz.open(pdf_path)
    total_images = 0
    
    # Extract embedded images
    for page_num in range(len(doc)):
        page = doc[page_num]
        image_list = page.get_images()
        
        for img_index, img in enumerate(image_list):
            xref = img[0]
            base_image = doc.extract_image(xref)
            image_bytes = base_image["image"]
            image_ext = base_image["ext"]
            
            # Generate filename
            filename = f"page-{page_num + 1:02d}-image-{img_index + 1:02d}.{image_ext}"
            output_path = output_dir / filename
            
            # Save image
            with open(output_path, "wb") as img_file:
                img_file.write(image_bytes)
            
            total_images += 1
            print(f"  Extracted: {filename} ({len(image_bytes)} bytes)")
    
    # Also extract page screenshots (in case images are rasterized)
    print()
    print("Extracting page screenshots (for rasterized content)...")
    for page_num in range(len(doc)):
        page = doc[page_num]
        pix = page.get_pixmap(matrix=fitz.Matrix(2, 2))  # 2x zoom for better quality
        
        filename = f"page-{page_num + 1:02d}-screenshot.png"
        output_path = output_dir / filename
        
        pix.save(output_path)
        print(f"  Saved: {filename}")
    
    doc.close()
    
    print()
    print(f"✅ Extraction complete!")
    print(f"   - Extracted {total_images} embedded images")
    print(f"   - Created {len(doc)} page screenshots")
    print(f"   - Output directory: {output_dir}")


def main():
    parser = argparse.ArgumentParser(
        description="Extract images from Kaizen quickstart PDF",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__
    )
    parser.add_argument(
        "pdf_path",
        type=str,
        help="Path to the PDF file"
    )
    parser.add_argument(
        "--output-dir",
        type=str,
        default=None,
        help="Output directory for images (default: kamiwaza-docs/static/img/extensions/kaizen)"
    )
    
    args = parser.parse_args()
    
    # Determine output directory
    if args.output_dir:
        output_dir = Path(args.output_dir)
    else:
        # Default to kamiwaza-docs static directory
        script_dir = Path(__file__).parent.resolve()
        # Navigate to kamiwaza-docs root (scripts/ -> root)
        repo_root = script_dir.parent
        # Static directory is at docs/static
        static_dir = repo_root / "docs" / "static" / "img" / "extensions" / "kaizen"
        if static_dir.parent.exists():
            output_dir = static_dir
        else:
            # Fallback to current directory
            output_dir = Path.cwd() / "extracted-images"
            print(f"Warning: Could not find kamiwaza-docs static directory. Using: {output_dir}")
    
    extract_images_from_pdf(args.pdf_path, output_dir)


if __name__ == "__main__":
    main()
