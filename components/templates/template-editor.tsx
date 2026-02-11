"use client"

import { useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import {
  Image as ImageIcon,
  Type,
  Square,
  Circle,
  Upload,
  Download,
  Save,
  Trash2,
  ZoomIn,
  ZoomOut,
  Eye,
  Layers,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"
import { cn } from "@/lib/utils"

export function TemplateEditor() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [canvas, setCanvas] = useState<any>(null)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [selectedObject, setSelectedObject] = useState<any>(null)
  const [fabricLoaded, setFabricLoaded] = useState(false)

  // Initialize Fabric.js canvas with dynamic import
  useEffect(() => {
    if (!canvasRef.current) return

    // Dynamically import fabric.js to reduce initial bundle
    import("fabric").then((fabricModule) => {
      const fabricCanvas = new fabricModule.Canvas(canvasRef.current, {
        width: 1920,
        height: 1080,
        backgroundColor: "#ffffff",
      })

      setCanvas(fabricCanvas)
      setFabricLoaded(true)

    // Handle object selection
    fabricCanvas.on("selection:created", (e) => {
      setSelectedObject(e.selected?.[0] || null)
    })

    fabricCanvas.on("selection:updated", (e) => {
      setSelectedObject(e.selected?.[0] || null)
    })

      fabricCanvas.on("selection:cleared", () => {
        setSelectedObject(null)
      })
    })

    return () => {
      if (canvas) {
        canvas.dispose()
      }
    }
  }, [])

  // Add text to canvas
  const addText = async () => {
    if (!canvas) return

    const fabricModule = await import("fabric")
    const text = new fabricModule.IText("Double click to edit", {
      left: 100,
      top: 100,
      fontFamily: "Arial",
      fontSize: 40,
      fill: "#000000",
    })

    canvas.add(text)
    canvas.setActiveObject(text)
    canvas.renderAll()
  }

  // Add rectangle
  const addRectangle = async () => {
    if (!canvas) return

    const fabricModule = await import("fabric")
    const rect = new fabricModule.Rect({
      left: 150,
      top: 150,
      fill: "#3b82f6",
      width: 200,
      height: 150,
    })

    canvas.add(rect)
    canvas.setActiveObject(rect)
    canvas.renderAll()
  }

  // Add circle
  const addCircle = async () => {
    if (!canvas) return

    const fabricModule = await import("fabric")
    const circle = new fabricModule.Circle({
      left: 200,
      top: 200,
      radius: 75,
      fill: "#ef4444",
    })

    canvas.add(circle)
    canvas.setActiveObject(circle)
    canvas.renderAll()
  }

  // Upload and add image
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!canvas || !e.target.files?.[0]) return

    const fabricModule = await import("fabric")
    const file = e.target.files[0]
    const reader = new FileReader()

    reader.onload = (event) => {
      const imgUrl = event.target?.result as string
      fabricModule.Image.fromURL(imgUrl, (img) => {
        img.scaleToWidth(400)
        canvas.add(img)
        canvas.setActiveObject(img)
        canvas.renderAll()
      })
    }

    reader.readAsDataURL(file)
  }

  // Delete selected object
  const deleteSelected = () => {
    if (!canvas) return
    const activeObjects = canvas.getActiveObjects()
    canvas.remove(...activeObjects)
    canvas.discardActiveObject()
    canvas.renderAll()
  }

  // Change fill color
  const changeFillColor = (color: string) => {
    if (!canvas || !selectedObject) return
    selectedObject.set("fill", color)
    canvas.renderAll()
  }

  // Export canvas as JSON
  const exportJSON = () => {
    if (!canvas) return
    const json = canvas.toJSON()
    console.log("[v0] Exported template JSON:", json)
    // TODO: Save to database
  }

  // Export canvas as PNG
  const exportPNG = () => {
    if (!canvas) return
    const dataURL = canvas.toDataURL({
      format: "png",
      quality: 1,
    })
    const link = document.createElement("a")
    link.download = "template.png"
    link.href = dataURL
    link.click()
  }

  return (
    <div className="flex h-screen bg-background">
      {/* Left Sidebar */}
      <div
        className={cn(
          "bg-card border-r transition-all duration-300",
          sidebarCollapsed ? "w-16" : "w-80"
        )}
      >
        <div className="flex items-center justify-between p-4 border-b">
          {!sidebarCollapsed && <h2 className="font-semibold">Tools</h2>}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          >
            {sidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </Button>
        </div>

        <div className="p-4 space-y-4">
          {/* Add Elements */}
          {!sidebarCollapsed && (
            <>
              <div>
                <Label className="text-sm font-medium mb-2 block">Add Elements</Label>
                <div className="grid grid-cols-2 gap-2">
                  <Button variant="outline" onClick={addText} className="flex items-center gap-2">
                    <Type className="w-4 h-4" />
                    Text
                  </Button>
                  <Button variant="outline" onClick={addRectangle} className="flex items-center gap-2">
                    <Square className="w-4 h-4" />
                    Rectangle
                  </Button>
                  <Button variant="outline" onClick={addCircle} className="flex items-center gap-2">
                    <Circle className="w-4 h-4" />
                    Circle
                  </Button>
                  <Button variant="outline" className="flex items-center gap-2" asChild>
                    <label>
                      <ImageIcon className="w-4 h-4" />
                      Image
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleImageUpload}
                      />
                    </label>
                  </Button>
                </div>
              </div>

              <Separator />

              {/* Properties Panel */}
              {selectedObject && (
                <div>
                  <Label className="text-sm font-medium mb-2 block">Properties</Label>
                  <div className="space-y-3">
                    <div>
                      <Label className="text-xs">Fill Color</Label>
                      <div className="flex gap-2 mt-1">
                        {["#000000", "#ef4444", "#3b82f6", "#10b981", "#f59e0b", "#8b5cf6"].map((color) => (
                          <button
                            key={color}
                            className="w-8 h-8 rounded border-2 border-border hover:scale-110 transition"
                            style={{ backgroundColor: color }}
                            onClick={() => changeFillColor(color)}
                          />
                        ))}
                      </div>
                    </div>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={deleteSelected}
                      className="w-full"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Main Canvas Area */}
      <div className="flex-1 flex flex-col">
        {/* Top Toolbar */}
        <div className="bg-card border-b p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Input
              placeholder="Untitled Template"
              className="w-64"
              defaultValue="My Template"
            />
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={exportJSON}>
              <Save className="w-4 h-4 mr-2" />
              Save
            </Button>
            <Button variant="outline" size="sm" onClick={exportPNG}>
              <Download className="w-4 h-4 mr-2" />
              Export PNG
            </Button>
            <Button size="sm">
              <Eye className="w-4 h-4 mr-2" />
              Preview
            </Button>
          </div>
        </div>

        {/* Canvas Container */}
        <div className="flex-1 bg-muted/30 overflow-auto flex items-center justify-center p-8">
          <div className="bg-white shadow-2xl">
            <canvas ref={canvasRef} />
          </div>
        </div>
      </div>
    </div>
  )
}
