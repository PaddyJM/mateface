import { useState } from 'react'
import Carousel from './components/Carousel'

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
            {trainingImages.length > 0 && <Carousel slides={trainingImages} />}
            <input type="file" onChange={handleFileChange} multiple />
        </div>
    )
}

export default App
