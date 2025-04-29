import { useState } from 'react'
import Carousel from './components/Carousel'
import './App.css'
import { Button } from './components/ui/button'

function App() {
    const [trainingImages, setTrainingImages] = useState<string[]>([])

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files
        if (files) {
            const trainingImageURLs = Array.from(files).map((file) =>
                URL.createObjectURL(file)
            )
            setTrainingImages(trainingImageURLs)
        }
    }

    return (
        <div>
            {trainingImages.length > 0 ? (
                <div className="flex flex-col justify-center items-center">
                    <Carousel slides={trainingImages} />
                    <Button>Train AI</Button>
                </div>
            ) : (
                <input type="file" onChange={handleFileChange} multiple />
            )}
        </div>
    )
}

export default App
