import React, { useState } from 'react';
import { FlashcardDeck, Flashcard, Subject } from '../types';
import { studyApi } from '../api';
import { Plus, Layers, RotateCw, CheckCircle, ArrowLeft, X } from 'lucide-react';

interface FlashcardsViewProps {
  decks: FlashcardDeck[];
  subjects: Subject[];
  onRefreshData: () => void;
}

export const FlashcardsView: React.FC<FlashcardsViewProps> = ({
  decks,
  subjects,
  onRefreshData,
}) => {
  const [activeDeck, setActiveDeck] = useState<FlashcardDeck | null>(null);
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [loadingCards, setLoadingCards] = useState(false);

  // Modals
  const [showDeckModal, setShowDeckModal] = useState(false);
  const [showCardModal, setShowCardModal] = useState(false);

  // Deck form
  const [deckTitle, setDeckTitle] = useState('');
  const [deckDesc, setDeckDesc] = useState('');
  const [deckSubjectId, setDeckSubjectId] = useState('');

  // Card form
  const [cardFront, setCardFront] = useState('');
  const [cardBack, setCardBack] = useState('');

  const handleOpenDeck = async (deck: FlashcardDeck) => {
    setActiveDeck(deck);
    setLoadingCards(true);
    setCurrentCardIndex(0);
    setIsFlipped(false);

    try {
      const res = await studyApi.getDeckCards(deck.id);
      setCards(res.cards);
    } catch (err) {
      console.error('Failed to load cards:', err);
    } finally {
      setLoadingCards(false);
    }
  };

  const handleReviewRating = async (rating: 'again' | 'hard' | 'good' | 'easy') => {
    if (!cards[currentCardIndex]) return;

    try {
      await studyApi.reviewCard(cards[currentCardIndex].id, rating);
      setIsFlipped(false);

      if (currentCardIndex + 1 < cards.length) {
        setCurrentCardIndex((prev) => prev + 1);
      } else {
        alert('🎉 Deck review completed! Great job on your active recall session.');
        setActiveDeck(null);
        onRefreshData();
      }
    } catch (err) {
      console.error('Failed to submit review:', err);
    }
  };

  const handleCreateDeck = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deckTitle.trim()) return;

    try {
      await studyApi.createDeck({
        title: deckTitle,
        description: deckDesc || undefined,
        subjectId: deckSubjectId || undefined,
      });

      setShowDeckModal(false);
      setDeckTitle('');
      setDeckDesc('');
      onRefreshData();
    } catch (err) {
      console.error('Failed to create deck:', err);
    }
  };

  const handleCreateCard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cardFront.trim() || !cardBack.trim() || !activeDeck) return;

    try {
      const res = await studyApi.createCard(activeDeck.id, {
        front: cardFront,
        back: cardBack,
      });

      setCards((prev) => [...prev, res.card]);
      setShowCardModal(false);
      setCardFront('');
      setCardBack('');
      onRefreshData();
    } catch (err) {
      console.error('Failed to add card:', err);
    }
  };

  return (
    <div className="space-y-6">
      {/* If in Study Mode */}
      {activeDeck ? (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setActiveDeck(null)}
              className="inline-flex items-center space-x-1.5 text-xs font-semibold text-slate-400 hover:text-white"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Decks</span>
            </button>

            <div className="flex items-center space-x-3">
              <span className="text-xs font-medium text-slate-400">
                Card {cards.length > 0 ? currentCardIndex + 1 : 0} of {cards.length}
              </span>
              <button
                onClick={() => setShowCardModal(true)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white flex items-center space-x-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Card</span>
              </button>
            </div>
          </div>

          {loadingCards ? (
            <div className="py-24 text-center text-sm text-slate-400">Loading flashcards...</div>
          ) : cards.length === 0 ? (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center">
              <Layers className="w-12 h-12 text-slate-700 mx-auto mb-3" />
              <h3 className="text-base font-semibold text-white">This deck is currently empty</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1 mb-4">
                Add terms, formulas, or questions to start reviewing with spaced repetition.
              </p>
              <button
                onClick={() => setShowCardModal(true)}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 text-white"
              >
                Add First Card
              </button>
            </div>
          ) : (
            <div className="max-w-xl mx-auto space-y-6">
              {/* Flip Card Container */}
              <div
                onClick={() => setIsFlipped(!isFlipped)}
                className="w-full min-h-[300px] p-8 rounded-2xl bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800 hover:border-slate-700 shadow-2xl flex flex-col items-center justify-center text-center cursor-pointer select-none transition-all hover:scale-[1.01] relative group"
              >
                <span className="absolute top-4 left-4 text-[10px] font-bold uppercase tracking-wider text-indigo-400 px-2 py-0.5 rounded-md bg-indigo-500/10 border border-indigo-500/20">
                  {isFlipped ? 'Answer' : 'Question / Prompt'}
                </span>

                <div className="absolute top-4 right-4 text-slate-500 group-hover:text-slate-300 transition-colors flex items-center space-x-1 text-xs">
                  <RotateCw className="w-3.5 h-3.5" />
                  <span>Click to flip</span>
                </div>

                <p className="text-xl sm:text-2xl font-bold text-white max-w-md leading-snug">
                  {isFlipped ? cards[currentCardIndex].back : cards[currentCardIndex].front}
                </p>

                <p className="absolute bottom-4 text-xs text-slate-500">
                  {isFlipped ? 'How well did you know this?' : 'Tap card to reveal answer'}
                </p>
              </div>

              {/* SM-2 Spaced Repetition Buttons */}
              {isFlipped && (
                <div className="grid grid-cols-4 gap-2 pt-2 animate-fadeIn">
                  <button
                    onClick={() => handleReviewRating('again')}
                    className="py-3 px-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-300 border border-red-500/30 text-center font-semibold text-xs transition-colors"
                  >
                    <div>Again</div>
                    <span className="text-[10px] text-red-400 font-normal">1 day</span>
                  </button>

                  <button
                    onClick={() => handleReviewRating('hard')}
                    className="py-3 px-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-center font-semibold text-xs transition-colors"
                  >
                    <div>Hard</div>
                    <span className="text-[10px] text-amber-400 font-normal">2 days</span>
                  </button>

                  <button
                    onClick={() => handleReviewRating('good')}
                    className="py-3 px-2 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-center font-semibold text-xs transition-colors"
                  >
                    <div>Good</div>
                    <span className="text-[10px] text-indigo-400 font-normal">4 days</span>
                  </button>

                  <button
                    onClick={() => handleReviewRating('easy')}
                    className="py-3 px-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-center font-semibold text-xs transition-colors"
                  >
                    <div>Easy</div>
                    <span className="text-[10px] text-emerald-400 font-normal">7+ days</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        /* Decks List Mode */
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-white">Flashcards & Spaced Repetition</h2>
              <p className="text-xs text-slate-400 mt-1">
                Active recall powered by SuperMemo-2 spaced intervals to transfer knowledge into long-term memory.
              </p>
            </div>

            <button
              onClick={() => setShowDeckModal(true)}
              className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl text-sm font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/20 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Create Deck</span>
            </button>
          </div>

          {decks.length === 0 ? (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center">
              <Layers className="w-12 h-12 text-slate-700 mx-auto mb-3" />
              <h3 className="text-base font-semibold text-slate-200">No flashcard decks yet</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1 mb-4">
                Create a deck to start reviewing key terms, definitions, and formulas.
              </p>
              <button
                onClick={() => setShowDeckModal(true)}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-500 shadow-md"
              >
                Create Deck
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {decks.map((deck) => (
                <div
                  key={deck.id}
                  onClick={() => handleOpenDeck(deck)}
                  className="p-5 rounded-2xl bg-slate-900 border border-slate-800 hover:border-indigo-500/50 shadow-lg cursor-pointer transition-all hover:scale-[1.02] flex flex-col justify-between"
                >
                  <div>
                    {deck.subject_name && (
                      <span className="inline-flex items-center space-x-1 text-xs text-slate-400 mb-2">
                        <span
                          className="w-2 h-2 rounded-full inline-block"
                          style={{ backgroundColor: deck.subject_color || '#6366f1' }}
                        />
                        <span>{deck.subject_name}</span>
                      </span>
                    )}
                    <h3 className="text-base font-bold text-white">{deck.title}</h3>
                    {deck.description && (
                      <p className="text-xs text-slate-400 mt-1 line-clamp-2">{deck.description}</p>
                    )}
                  </div>

                  <div className="flex items-center justify-between mt-5 pt-3 border-t border-slate-800/80 text-xs">
                    <span className="text-slate-400">{deck.card_count || 0} total cards</span>
                    {deck.due_count && deck.due_count > 0 ? (
                      <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 font-semibold">
                        {deck.due_count} due
                      </span>
                    ) : (
                      <span className="text-emerald-400 flex items-center space-x-1">
                        <CheckCircle className="w-3.5 h-3.5" />
                        <span>Up to date</span>
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* CREATE DECK MODAL */}
      {showDeckModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl relative">
            <button
              onClick={() => setShowDeckModal(false)}
              className="absolute top-4 right-4 p-1 rounded-lg text-slate-400 hover:text-slate-200"
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-lg font-bold text-white mb-4">Create Flashcard Deck</h3>

            <form onSubmit={handleCreateDeck} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Deck Title</label>
                <input
                  type="text"
                  required
                  value={deckTitle}
                  onChange={(e) => setDeckTitle(e.target.value)}
                  placeholder="e.g. Essential Medical Terminology"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Subject <span className="text-slate-500 text-[10px]">(Optional)</span>
                </label>
                <select
                  value={deckSubjectId}
                  onChange={(e) => setDeckSubjectId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                >
                  <option value="">Select subject...</option>
                  {subjects.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Description</label>
                <textarea
                  value={deckDesc}
                  onChange={(e) => setDeckDesc(e.target.value)}
                  rows={2}
                  placeholder="Topics covered in this deck..."
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowDeckModal(false)}
                  className="flex-1 py-2 text-xs font-semibold rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white shadow-md"
                >
                  Save Deck
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE CARD MODAL */}
      {showCardModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl relative">
            <button
              onClick={() => setShowCardModal(false)}
              className="absolute top-4 right-4 p-1 rounded-lg text-slate-400 hover:text-slate-200"
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-lg font-bold text-white mb-4">Add Flashcard</h3>

            <form onSubmit={handleCreateCard} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Front (Question / Prompt)
                </label>
                <textarea
                  required
                  rows={3}
                  value={cardFront}
                  onChange={(e) => setCardFront(e.target.value)}
                  placeholder="e.g. What is the equation for photosynthetic rate?"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Back (Answer / Explanation)
                </label>
                <textarea
                  required
                  rows={3}
                  value={cardBack}
                  onChange={(e) => setCardBack(e.target.value)}
                  placeholder="e.g. 6CO2 + 6H2O -> C6H12O6 + 6O2"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCardModal(false)}
                  className="flex-1 py-2 text-xs font-semibold rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white shadow-md"
                >
                  Add Card
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
