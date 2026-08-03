from typing import List, Optional
from pathlib import Path
from langchain.schema import Document
from langchain_community.document_loaders import (
    PyPDFLoader,
    TextLoader
)
from app.core.logging import logger


class DocumentLoaderFactory:
    """Factory class to load documents from various file formats."""
    
    @staticmethod
    def load_pdf(file_path: str) -> List[Document]:
        """
        Load documents from a PDF file.
        
        Args:
            file_path: Path to the PDF file
            
        Returns:
            List of Document objects
            
        Raises:
            FileNotFoundError: If file doesn't exist
            Exception: If loading fails
        """
        try:
            loader = PyPDFLoader(file_path)
            documents = loader.load()
            logger.info(f"Loaded {len(documents)} pages from PDF: {file_path}")
            return documents
        except Exception as e:
            logger.error(f"Failed to load PDF {file_path}: {str(e)}")
            raise
    
    @staticmethod
    def load_text(file_path: str) -> List[Document]:
        """
        Load documents from a text file.
        
        Args:
            file_path: Path to the text file
            
        Returns:
            List of Document objects
            
        Raises:
            FileNotFoundError: If file doesn't exist
            Exception: If loading fails
        """
        try:
            loader = TextLoader(file_path, encoding='utf-8')
            documents = loader.load()
            logger.info(f"Loaded {len(documents)} documents from text file: {file_path}")
            return documents
        except Exception as e:
            logger.error(f"Failed to load text file {file_path}: {str(e)}")
            raise
    
    @staticmethod
    def load_markdown(file_path: str) -> List[Document]:
        """
        Load documents from a markdown file.
        
        Args:
            file_path: Path to the markdown file
            
        Returns:
            List of Document objects
            
        Raises:
            FileNotFoundError: If file doesn't exist
            Exception: If loading fails
        """
        try:
            # Use TextLoader for markdown files as well
            loader = TextLoader(file_path, encoding='utf-8')
            documents = loader.load()
            logger.info(f"Loaded {len(documents)} documents from markdown file: {file_path}")
            return documents
        except Exception as e:
            logger.error(f"Failed to load markdown file {file_path}: {str(e)}")
            raise
    
    @staticmethod
    def load_document(file_path: str) -> List[Document]:
        """
        Load a document based on its file extension.
        
        Args:
            file_path: Path to the document file
            
        Returns:
            List of Document objects
            
        Raises:
            ValueError: If file type is not supported
            Exception: If loading fails
        """
        path = Path(file_path)
        
        if not path.exists():
            raise FileNotFoundError(f"File not found: {file_path}")
        
        extension = path.suffix.lower()
        
        if extension == '.pdf':
            return DocumentLoaderFactory.load_pdf(file_path)
        elif extension in ['.txt', '.text']:
            return DocumentLoaderFactory.load_text(file_path)
        elif extension in ['.md', '.markdown']:
            return DocumentLoaderFactory.load_markdown(file_path)
        else:
            raise ValueError(
                f"Unsupported file type: {extension}. "
                "Supported types are: .pdf, .txt, .md"
            )
    
    @staticmethod
    def load_directory(directory_path: str) -> List[Document]:
        """
        Load all supported documents from a directory.
        
        Args:
            directory_path: Path to the directory containing documents
            
        Returns:
            List of all Document objects from the directory
            
        Raises:
            FileNotFoundError: If directory doesn't exist
        """
        directory = Path(directory_path)
        
        if not directory.exists():
            raise FileNotFoundError(f"Directory not found: {directory_path}")
        
        if not directory.is_dir():
            raise ValueError(f"Path is not a directory: {directory_path}")
        
        all_documents = []
        supported_extensions = {'.pdf', '.txt', '.text', '.md', '.markdown'}
        
        for file_path in directory.iterdir():
            if file_path.is_file() and file_path.suffix.lower() in supported_extensions:
                try:
                    documents = DocumentLoaderFactory.load_document(str(file_path))
                    all_documents.extend(documents)
                except Exception as e:
                    logger.warning(f"Failed to load {file_path}: {str(e)}")
                    continue
        
        logger.info(f"Loaded {len(all_documents)} documents from directory: {directory_path}")
        return all_documents


def load_document(file_path: str) -> List[Document]:
    """
    Convenience function to load a single document.
    
    Args:
        file_path: Path to the document file
        
    Returns:
        List of Document objects
    """
    return DocumentLoaderFactory.load_document(file_path)


def load_directory(directory_path: str) -> List[Document]:
    """
    Convenience function to load all documents from a directory.
    
    Args:
        directory_path: Path to the directory containing documents
        
    Returns:
        List of all Document objects
    """
    return DocumentLoaderFactory.load_directory(directory_path)
