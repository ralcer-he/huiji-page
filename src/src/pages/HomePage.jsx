import DiaryStream from '../components/home/DiaryStream'
import FloatingActionButton from '../components/ui/FloatingActionButton'

function HomePage() {
  return (
    <div className="animate-fade-in">
      <DiaryStream />
      <FloatingActionButton />
    </div>
  )
}

export default HomePage
