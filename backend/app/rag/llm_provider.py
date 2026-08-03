from typing import Optional, Any
from langchain_openai import ChatOpenAI, OpenAIEmbeddings
from langchain_google_genai import ChatGoogleGenerativeAI, GoogleGenerativeAIEmbeddings
from app.core.config import settings


class LLMProviderFactory:
    """Factory class to create LLM instances based on configuration."""
    
    @staticmethod
    def create_chat_llm(
        model: Optional[str] = None,
        temperature: float = 0.7,
        max_tokens: Optional[int] = None
    ) -> Any:
        """
        Create a chat LLM instance based on the configured provider.
        
        Args:
            model: Optional model name override
            temperature: Temperature for generation
            max_tokens: Maximum tokens to generate
            
        Returns:
            Configured chat LLM instance
            
        Raises:
            ValueError: If provider is not supported or API key is missing
        """
        provider = settings.LLM_PROVIDER.lower()
        
        if provider == "openai":
            if not settings.OPENAI_API_KEY:
                raise ValueError("OpenAI API key is required when LLM_PROVIDER is 'openai'")
            
            model_name = model or settings.OPENAI_MODEL
            return ChatOpenAI(
                model=model_name,
                temperature=temperature,
                max_tokens=max_tokens,
                openai_api_key=settings.OPENAI_API_KEY
            )
        
        elif provider == "gemini":
            if not settings.GEMINI_API_KEY:
                raise ValueError("Gemini API key is required when LLM_PROVIDER is 'gemini'")
            
            model_name = model or settings.GEMINI_MODEL
            return ChatGoogleGenerativeAI(
                model=model_name,
                temperature=temperature,
                google_api_key=settings.GEMINI_API_KEY
            )
        
        else:
            raise ValueError(
                f"Unsupported LLM provider: {provider}. "
                "Supported providers are: 'openai', 'gemini'"
            )
    
    @staticmethod
    def create_embeddings() -> Any:
        """
        Create an embeddings model based on the configured provider.
        
        Returns:
            Configured embeddings instance
            
        Raises:
            ValueError: If provider is not supported or API key is missing
        """
        provider = settings.LLM_PROVIDER.lower()
        
        if provider == "openai":
            if not settings.OPENAI_API_KEY:
                raise ValueError("OpenAI API key is required when LLM_PROVIDER is 'openai'")
            
            return OpenAIEmbeddings(
                model=settings.EMBEDDING_MODEL,
                openai_api_key=settings.OPENAI_API_KEY
            )
        
        elif provider == "gemini":
            if not settings.GEMINI_API_KEY:
                raise ValueError("Gemini API key is required when LLM_PROVIDER is 'gemini'")
            
            return GoogleGenerativeAIEmbeddings(
                model="models/embedding-001",
                google_api_key=settings.GEMINI_API_KEY
            )
        
        else:
            raise ValueError(
                f"Unsupported LLM provider: {provider}. "
                "Supported providers are: 'openai', 'gemini'"
            )


def get_chat_llm(
    model: Optional[str] = None,
    temperature: float = 0.7,
    max_tokens: Optional[int] = None
) -> Any:
    """
    Convenience function to get a chat LLM instance.
    
    Args:
        model: Optional model name override
        temperature: Temperature for generation
        max_tokens: Maximum tokens to generate
        
    Returns:
        Configured chat LLM instance
    """
    return LLMProviderFactory.create_chat_llm(model, temperature, max_tokens)


def get_embeddings() -> Any:
    """
    Convenience function to get an embeddings instance.
    
    Returns:
        Configured embeddings instance
    """
    return LLMProviderFactory.create_embeddings()
