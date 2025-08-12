import { createContext, useContext, useReducer, useEffect, useState } from 'react'

const FavoritesContext = createContext()

const FAVORITES_ACTIONS = {
  ADD_FAVORITE: 'ADD_FAVORITE',
  REMOVE_FAVORITE: 'REMOVE_FAVORITE',
  CLEAR_FAVORITES: 'CLEAR_FAVORITES',
  LOAD_FAVORITES: 'LOAD_FAVORITES'
}

const favoritesReducer = (state, action) => {
  switch (action.type) {
    case FAVORITES_ACTIONS.ADD_FAVORITE: {
      // Check if already in favorites
      const existingItem = state.find(item => item.id === action.payload.id)
      if (existingItem) {
        return state // Already in favorites
      }
      return [...state, action.payload]
    }

    case FAVORITES_ACTIONS.REMOVE_FAVORITE:
      return state.filter(item => item.id !== action.payload)

    case FAVORITES_ACTIONS.CLEAR_FAVORITES:
      return []

    case FAVORITES_ACTIONS.LOAD_FAVORITES:
      return action.payload || []

    default:
      return state
  }
}

export function FavoritesProvider({ children }) {
  const [favorites, dispatch] = useReducer(favoritesReducer, [])
  const [isFavoritesLoaded, setIsFavoritesLoaded] = useState(false)

  // Load favorites from localStorage on mount
  useEffect(() => {
    const savedFavorites = localStorage.getItem('mjkprints-favorites')
    console.log('❤️ Loading favorites from localStorage:', savedFavorites ? 'Found saved favorites' : 'No saved favorites')
    
    if (savedFavorites) {
      try {
        const parsedFavorites = JSON.parse(savedFavorites)
        console.log('❤️ Parsed saved favorites:', parsedFavorites.length, 'items')
        dispatch({ type: FAVORITES_ACTIONS.LOAD_FAVORITES, payload: parsedFavorites })
      } catch (error) {
        console.error('❌ Error loading favorites from localStorage:', error)
        localStorage.removeItem('mjkprints-favorites')
      }
    }
    
    // Mark favorites as loaded (allows saving to localStorage)
    setIsFavoritesLoaded(true)
  }, [])

  // Save favorites to localStorage only after initial load
  useEffect(() => {
    if (isFavoritesLoaded) {
      console.log('💾 Saving favorites to localStorage:', favorites.length, 'items')
      localStorage.setItem('mjkprints-favorites', JSON.stringify(favorites))
    }
  }, [favorites, isFavoritesLoaded])

  const addToFavorites = (product) => {
    const existingItem = favorites.find(item => item.id === product.id)
    dispatch({ type: FAVORITES_ACTIONS.ADD_FAVORITE, payload: product })
    
    // Return whether item was newly added or already existed
    return !existingItem
  }

  const removeFromFavorites = (productId) => {
    dispatch({ type: FAVORITES_ACTIONS.REMOVE_FAVORITE, payload: productId })
  }

  const clearFavorites = () => {
    dispatch({ type: FAVORITES_ACTIONS.CLEAR_FAVORITES })
  }

  const isFavorite = (productId) => {
    return favorites.some(item => item.id === productId)
  }

  const toggleFavorite = (product) => {
    if (isFavorite(product.id)) {
      removeFromFavorites(product.id)
      return false // Removed from favorites
    } else {
      addToFavorites(product)
      return true // Added to favorites
    }
  }

  const value = {
    favorites,
    addToFavorites,
    removeFromFavorites,
    clearFavorites,
    isFavorite,
    toggleFavorite
  }

  return (
    <FavoritesContext.Provider value={value}>
      {children}
    </FavoritesContext.Provider>
  )
}

export function useFavorites() {
  const context = useContext(FavoritesContext)
  
  if (context === undefined) {
    throw new Error('useFavorites must be used within a FavoritesProvider')
  }
  
  return context
}