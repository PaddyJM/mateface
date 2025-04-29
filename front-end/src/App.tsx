import useEmblaCarousel from 'embla-carousel-react'
import { useState } from 'react'

function App() {
    const [emblaRef] = useEmblaCarousel({ loop: true })
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
        <div className="flex justify-center items-center h-screen">
            {trainingImages.length > 0 && (
                <div className="embla" ref={emblaRef}>
                    <div className="embla__container">
                        {trainingImages.map((image, index) => (
                            <div className="embla__slide" key={index}>
                                <img
                                    src={image}
                                    alt={`Training Image ${index + 1}`}
                                />
                            </div>
                        ))}
                    </div>
                </div>
            )}
            <input type="file" onChange={handleFileChange} multiple />
        </div>
    )
}

export default App
