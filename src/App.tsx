import './App.css'

type Marker = {
  name: string
  value: number
  unit: string
  low: number
  high: number
}

// Placeholder data — replace once real results are wired in.
const markers: Marker[] = [
  { name: 'Hemoglobin', value: 14.2, unit: 'g/dL', low: 13.5, high: 17.5 },
  { name: 'Glucose (fasting)', value: 103, unit: 'mg/dL', low: 70, high: 99 },
  { name: 'Vitamin D', value: 28, unit: 'ng/mL', low: 30, high: 100 },
  { name: 'TSH', value: 2.1, unit: 'mIU/L', low: 0.4, high: 4.0 },
]

function isOutOfRange({ value, low, high }: Marker) {
  return value < low || value > high
}

function App() {
  return (
    <div className="app">
      <header className="app__header">
        <h1 className="app__title">LabScope</h1>
        <p className="app__subtitle">Your test results, in plain sight</p>
      </header>

      <main className="app__main">
        {markers.map((marker) => (
          <article
            key={marker.name}
            className={`card${isOutOfRange(marker) ? ' card--flagged' : ''}`}
          >
            <h2 className="card__label">{marker.name}</h2>
            <p className="card__value">
              {marker.value}
              <span className="card__unit">{marker.unit}</span>
            </p>
            <p className="card__range">
              Reference {marker.low}–{marker.high} {marker.unit}
            </p>
          </article>
        ))}
      </main>
    </div>
  )
}

export default App
