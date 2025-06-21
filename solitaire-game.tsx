import React, { useState, useEffect, useCallback } from 'react';

const SUITS = ['♠', '♥', '♦', '♣'];
const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

const createDeck = () => {
  const deck = [];
  for (let suit of SUITS) {
    for (let rank of RANKS) {
      deck.push({
        suit,
        rank,
        id: `${rank}-${suit}`,
        faceUp: false,
        red: suit === '♥' || suit === '♦'
      });
    }
  }
  return deck;
};

const shuffleDeck = (deck) => {
  const shuffled = [...deck];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

const Card = ({ card, onClick, style, draggable = false, onDragStart, placeholder = false }) => {
  if (placeholder) {
    return (
      <div 
        className="w-12 h-16 border-2 border-dashed border-gray-300 rounded-lg bg-gray-50"
        style={style}
      />
    );
  }

  if (!card.faceUp) {
    return (
      <div
        className="w-12 h-16 bg-blue-800 border border-gray-600 rounded-lg cursor-pointer flex items-center justify-center shadow-sm"
        onClick={onClick}
        style={style}
        draggable={false}
      >
        <div className="w-8 h-12 bg-blue-900 rounded border border-blue-700"></div>
      </div>
    );
  }

  return (
    <div
      className={`w-12 h-16 bg-white border border-gray-800 rounded-lg cursor-pointer shadow-sm flex flex-col justify-between overflow-hidden ${
        card.red ? 'text-red-600' : 'text-black'
      }`}
      onClick={onClick}
      style={style}
      draggable={false}
    >
      <div className="text-xs font-bold leading-none p-0.5 h-fit">
        <div className="leading-none">{card.rank}</div>
        <div className="leading-none">{card.suit}</div>
      </div>
      <div className="text-sm leading-none self-center flex-shrink-0">
        {card.suit}
      </div>
      <div className="text-xs font-bold leading-none transform rotate-180 self-end p-0.5 h-fit">
        <div className="leading-none">{card.rank}</div>
        <div className="leading-none">{card.suit}</div>
      </div>
    </div>
  );
};

const Solitaire = () => {
  const [stock, setStock] = useState([]);
  const [waste, setWaste] = useState([]);
  const [foundations, setFoundations] = useState([[], [], [], []]);
  const [tableau, setTableau] = useState([[], [], [], [], [], [], []]);
  const [selectedCards, setSelectedCards] = useState([]);
  const [selectedSource, setSelectedSource] = useState(null);
  const [gameWon, setGameWon] = useState(false);

  const dealCards = useCallback(() => {
    const deck = shuffleDeck(createDeck());
    const newTableau = [[], [], [], [], [], [], []];
    let cardIndex = 0;

    // Deal tableau cards
    for (let col = 0; col < 7; col++) {
      for (let row = 0; row <= col; row++) {
        const card = deck[cardIndex++];
        card.faceUp = row === col;
        newTableau[col].push(card);
      }
    }

    setTableau(newTableau);
    setStock(deck.slice(cardIndex));
    setWaste([]);
    setFoundations([[], [], [], []]);
    setSelectedCards([]);
    setSelectedSource(null);
    setGameWon(false);
  }, []);

  useEffect(() => {
    dealCards();
  }, [dealCards]);

  const checkWin = useCallback(() => {
    const totalFoundationCards = foundations.reduce((sum, pile) => sum + pile.length, 0);
    if (totalFoundationCards === 52) {
      setGameWon(true);
    }
  }, [foundations]);

  useEffect(() => {
    checkWin();
  }, [checkWin]);

  const drawFromStock = () => {
    if (stock.length > 0) {
      const drawnCards = stock.slice(0, 3);
      drawnCards.forEach(card => card.faceUp = true);
      setWaste([...drawnCards.reverse(), ...waste]);
      setStock(stock.slice(3));
    } else if (waste.length > 0) {
      const resetStock = [...waste].reverse();
      resetStock.forEach(card => card.faceUp = false);
      setStock(resetStock);
      setWaste([]);
    }
  };

  const canPlaceOnFoundation = (card, foundationIndex) => {
    const foundation = foundations[foundationIndex];
    if (foundation.length === 0) {
      return card.rank === 'A';
    }
    const topCard = foundation[foundation.length - 1];
    return card.suit === topCard.suit && 
           RANKS.indexOf(card.rank) === RANKS.indexOf(topCard.rank) + 1;
  };

  const canPlaceOnTableau = (cards, columnIndex) => {
    const column = tableau[columnIndex];
    if (column.length === 0) {
      return cards[0].rank === 'K';
    }
    const topCard = column[column.length - 1];
    const firstCard = cards[0];
    return topCard.red !== firstCard.red && 
           RANKS.indexOf(firstCard.rank) === RANKS.indexOf(topCard.rank) - 1;
  };

  const handleCardClick = (card, source, sourceIndex, cardIndex) => {
    if (selectedCards.length > 0) {
      // Try to place selected cards
      if (source === 'foundation' && selectedCards.length === 1) {
        if (canPlaceOnFoundation(selectedCards[0], sourceIndex)) {
          moveCards(selectedCards, selectedSource.source, selectedSource.sourceIndex, 'foundation', sourceIndex);
        }
      } else if (source === 'tableau') {
        if (canPlaceOnTableau(selectedCards, sourceIndex)) {
          moveCards(selectedCards, selectedSource.source, selectedSource.sourceIndex, 'tableau', sourceIndex);
        }
      }
      setSelectedCards([]);
      setSelectedSource(null);
    } else {
      // Select cards
      if (source === 'waste' && sourceIndex === 0) {
        setSelectedCards([card]);
        setSelectedSource({ source, sourceIndex, cardIndex });
      } else if (source === 'tableau') {
        const column = tableau[sourceIndex];
        const availableCards = column.slice(cardIndex).filter(c => c.faceUp);
        if (availableCards.length > 0) {
          setSelectedCards(availableCards);
          setSelectedSource({ source, sourceIndex, cardIndex });
        }
      } else if (source === 'foundation' && sourceIndex === foundations[sourceIndex].length - 1) {
        setSelectedCards([card]);
        setSelectedSource({ source, sourceIndex, cardIndex });
      }
    }
  };

  const moveCards = (cards, fromSource, fromIndex, toSource, toIndex) => {
    // Handle tableau to tableau moves in one operation
    if (fromSource === 'tableau' && toSource === 'tableau') {
      const newTableau = [...tableau];
      // Remove cards from source
      newTableau[fromIndex] = newTableau[fromIndex].slice(0, -cards.length);
      // Add cards to destination
      newTableau[toIndex] = [...newTableau[toIndex], ...cards];
      // Flip the next card if it exists and is face down
      if (newTableau[fromIndex].length > 0) {
        const lastCard = newTableau[fromIndex][newTableau[fromIndex].length - 1];
        if (!lastCard.faceUp) {
          lastCard.faceUp = true;
        }
      }
      setTableau(newTableau);
      return;
    }

    // Handle removing from source
    if (fromSource === 'waste') {
      setWaste(waste.slice(1));
    } else if (fromSource === 'tableau') {
      const newTableau = [...tableau];
      newTableau[fromIndex] = newTableau[fromIndex].slice(0, -cards.length);
      // Flip the next card if it exists and is face down
      if (newTableau[fromIndex].length > 0) {
        const lastCard = newTableau[fromIndex][newTableau[fromIndex].length - 1];
        if (!lastCard.faceUp) {
          lastCard.faceUp = true;
        }
      }
      setTableau(newTableau);
    } else if (fromSource === 'foundation') {
      const newFoundations = [...foundations];
      newFoundations[fromIndex] = newFoundations[fromIndex].slice(0, -1);
      setFoundations(newFoundations);
    }

    // Handle adding to destination
    if (toSource === 'foundation') {
      const newFoundations = [...foundations];
      newFoundations[toIndex] = [...newFoundations[toIndex], ...cards];
      setFoundations(newFoundations);
    } else if (toSource === 'tableau') {
      const newTableau = [...tableau];
      newTableau[toIndex] = [...newTableau[toIndex], ...cards];
      setTableau(newTableau);
    }
  };

  const handleEmptySpaceClick = (source, sourceIndex) => {
    if (selectedCards.length > 0) {
      if (source === 'foundation' && selectedCards.length === 1) {
        if (canPlaceOnFoundation(selectedCards[0], sourceIndex)) {
          moveCards(selectedCards, selectedSource.source, selectedSource.sourceIndex, 'foundation', sourceIndex);
        }
      } else if (source === 'tableau') {
        if (canPlaceOnTableau(selectedCards, sourceIndex)) {
          moveCards(selectedCards, selectedSource.source, selectedSource.sourceIndex, 'tableau', sourceIndex);
        }
      }
      setSelectedCards([]);
      setSelectedSource(null);
    }
  };

  const isCardSelected = (card, source, sourceIndex, cardIndex) => {
    return selectedCards.some(selected => selected.id === card.id) &&
           selectedSource?.source === source &&
           selectedSource?.sourceIndex === sourceIndex;
  };

  return (
    <div className="h-screen bg-green-700 flex flex-col p-2 overflow-hidden">
      {/* Header */}
      <div className="flex justify-between items-center mb-2">
        <button
          onClick={dealCards}
          className="bg-blue-600 text-white px-3 py-1 rounded text-sm"
        >
          New Game
        </button>
        <div className="text-center">
          {selectedCards.length > 0 && (
            <div className="bg-yellow-300 text-black px-2 py-1 rounded text-xs">
              {selectedCards.length} card{selectedCards.length > 1 ? 's' : ''} selected
            </div>
          )}
          {gameWon && (
            <div className="bg-yellow-400 text-black px-3 py-1 rounded font-bold text-sm">
              You Won!
            </div>
          )}
        </div>
      </div>

      {/* Foundations and Stock */}
      <div className="flex justify-between mb-3">
        {/* Stock and Waste */}
        <div className="flex gap-1">
          <div
            onClick={drawFromStock}
            className="cursor-pointer"
          >
            {stock.length > 0 ? (
              <Card card={{ faceUp: false }} />
            ) : (
              <Card placeholder={true} />
            )}
          </div>
          <div>
            {waste.length > 0 ? (
              <Card 
                card={waste[0]} 
                onClick={() => handleCardClick(waste[0], 'waste', 0, 0)}
                style={{
                  transform: isCardSelected(waste[0], 'waste', 0, 0) ? 'translateY(-6px)' : 'none',
                  zIndex: isCardSelected(waste[0], 'waste', 0, 0) ? 10 : 1,
                  boxShadow: isCardSelected(waste[0], 'waste', 0, 0) ? '0 4px 8px rgba(0,0,0,0.3)' : 'none'
                }}
              />
            ) : (
              <Card placeholder={true} />
            )}
          </div>
        </div>

        {/* Foundations */}
        <div className="flex gap-1">
          {foundations.map((foundation, index) => (
            <div key={index} onClick={() => handleEmptySpaceClick('foundation', index)}>
              {foundation.length > 0 ? (
                <Card 
                  card={foundation[foundation.length - 1]} 
                  onClick={() => handleCardClick(foundation[foundation.length - 1], 'foundation', index, foundation.length - 1)}
                />
              ) : (
                <Card placeholder={true} />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Tableau */}
      <div className="flex-1 overflow-hidden">
        <div className="flex gap-1 h-full">
          {tableau.map((column, columnIndex) => (
            <div key={columnIndex} className="flex-1 relative">
              <div 
                className="absolute inset-0 cursor-pointer"
                onClick={() => handleEmptySpaceClick('tableau', columnIndex)}
              >
                {column.length === 0 && <Card placeholder={true} />}
                {column.map((card, cardIndex) => {
                  const isSelected = isCardSelected(card, 'tableau', columnIndex, cardIndex);
                  const isPartOfSelection = selectedSource?.source === 'tableau' && 
                                          selectedSource?.sourceIndex === columnIndex && 
                                          cardIndex >= selectedSource?.cardIndex;
                  
                  return (
                    <Card
                      key={card.id}
                      card={card}
                      onClick={() => handleCardClick(card, 'tableau', columnIndex, cardIndex)}
                      style={{
                        position: 'absolute',
                        top: `${cardIndex * 10}px`,
                        transform: isPartOfSelection ? 'translateY(-6px)' : 'none',
                        zIndex: isPartOfSelection ? 10 + cardIndex : cardIndex,
                        boxShadow: isPartOfSelection ? '0 4px 8px rgba(0,0,0,0.3)' : 'none'
                      }}
                    />
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Instructions */}
      {selectedCards.length === 0 && !gameWon && (
        <div className="text-center text-green-200 text-xs mb-1">
          Tap cards to select, then tap destination to move
        </div>
      )}
    </div>
  );
};

export default Solitaire;