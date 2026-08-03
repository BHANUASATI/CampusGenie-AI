from typing import List, Optional
from langchain.schema import Document
from langchain.text_splitter import RecursiveCharacterTextSplitter
from app.core.config import settings
from app.core.logging import logger


class TextSplitterFactory:
    """Factory class to create text splitters with configurable parameters."""
    
    @staticmethod
    def create_text_splitter(
        chunk_size: Optional[int] = None,
        chunk_overlap: Optional[int] = None,
        separators: Optional[List[str]] = None
    ) -> RecursiveCharacterTextSplitter:
        """
        Create a text splitter instance with configured parameters.
        
        Args:
            chunk_size: Maximum size of text chunks (default from config)
            chunk_overlap: Overlap between chunks (default from config)
            separators: List of separators to use for splitting
            
        Returns:
            RecursiveCharacterTextSplitter instance
        """
        chunk_size = chunk_size or settings.CHUNK_SIZE
        chunk_overlap = chunk_overlap or settings.CHUNK_OVERLAP
        
        # Default separators for structured text
        default_separators = [
            "\n\n",  # Paragraph breaks
            "\n",    # Line breaks
            ". ",    # Sentence endings
            ", ",    # Comma separators
            " ",     # Word boundaries
            ""       # Character boundaries
        ]
        
        separators = separators or default_separators
        
        splitter = RecursiveCharacterTextSplitter(
            chunk_size=chunk_size,
            chunk_overlap=chunk_overlap,
            separators=separators,
            length_function=len,
        )
        
        logger.info(
            f"Created text splitter: chunk_size={chunk_size}, "
            f"chunk_overlap={chunk_overlap}"
        )
        
        return splitter
    
    @staticmethod
    def split_documents(
        documents: List[Document],
        chunk_size: Optional[int] = None,
        chunk_overlap: Optional[int] = None
    ) -> List[Document]:
        """
        Split a list of documents into smaller chunks.
        
        Args:
            documents: List of Document objects to split
            chunk_size: Maximum size of text chunks
            chunk_overlap: Overlap between chunks
            
        Returns:
            List of split Document objects
        """
        if not documents:
            logger.warning("No documents provided for splitting")
            return []
        
        splitter = TextSplitterFactory.create_text_splitter(
            chunk_size=chunk_size,
            chunk_overlap=chunk_overlap
        )
        
        split_docs = splitter.split_documents(documents)
        
        logger.info(
            f"Split {len(documents)} documents into {len(split_docs)} chunks"
        )
        
        return split_docs


def get_text_splitter(
    chunk_size: Optional[int] = None,
    chunk_overlap: Optional[int] = None
) -> RecursiveCharacterTextSplitter:
    """
    Convenience function to get a text splitter instance.
    
    Args:
        chunk_size: Maximum size of text chunks
        chunk_overlap: Overlap between chunks
        
    Returns:
        RecursiveCharacterTextSplitter instance
    """
    return TextSplitterFactory.create_text_splitter(chunk_size, chunk_overlap)


def split_documents(
    documents: List[Document],
    chunk_size: Optional[int] = None,
    chunk_overlap: Optional[int] = None
) -> List[Document]:
    """
    Convenience function to split documents into chunks.
    
    Args:
        documents: List of Document objects to split
        chunk_size: Maximum size of text chunks
        chunk_overlap: Overlap between chunks
        
    Returns:
        List of split Document objects
    """
    return TextSplitterFactory.split_documents(documents, chunk_size, chunk_overlap)
