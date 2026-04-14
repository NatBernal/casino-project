const RED_SUITS = ['♥', '♦']

export default function PlayingCard({ card, hidden = false, delay = 0 }) {
  if (hidden) {
    return (
      <div
        className="playing-card hidden"
        style={{ animationDelay: `${delay}ms` }}
        title="Carta oculta"
      />
    )
  }

  const isRed = RED_SUITS.includes(card?.palo)
  const colorClass = isRed ? 'card-red' : 'card-black'

  return (
    <div
      className={`playing-card ${colorClass}`}
      style={{ animationDelay: `${delay}ms` }}
      title={`${card?.valor} de ${card?.palo}`}
    >
      <span className="card-value">{card?.valor}</span>
      <span className="card-suit-center">{card?.palo}</span>
      <span className="card-value-bottom">{card?.valor}</span>
    </div>
  )
}