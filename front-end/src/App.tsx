import { useEffect, useState } from 'react'
import Carousel from './components/Carousel'
import './App.css'
import { Button } from './components/ui/button'

function App() {
    const [trainingImages, setTrainingImages] = useState<string[]>([])
    const [darkMode, setDarkMode] = useState(true)

    useEffect(() => {
        if (darkMode) {
            document.documentElement.classList.add('dark')
        } else {
            document.documentElement.classList.remove('dark')
        }
    }, [darkMode])

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
        <div className={darkMode ? 'dark' : ''}>
            <Button
                onClick={() => setDarkMode(!darkMode)}
                className="absolute top-4 right-4"
            >
                {darkMode ? '☀️' : '🌙'}
            </Button>
            {trainingImages.length > 0 ? (
                <div className="flex flex-col justify-center items-center">
                    <Carousel slides={trainingImages} />
                    <Button className="dark:text-white">Train AI</Button>
                </div>
            ) : (
                <div className="flex flex-col items-center gap-4">
                    <Button variant="outline" asChild>
                        <label className="dark:text-white">
                            Upload Images
                            <input
                                type="file"
                                onChange={handleFileChange}
                                multiple
                                className="hidden"
                            />
                        </label>
                    </Button>
                </div>
            )}
        </div>
    )
}

export default App
