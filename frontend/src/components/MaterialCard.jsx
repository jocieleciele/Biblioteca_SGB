import React from "react";
import { Star } from "lucide-react";
import { getImageSrc } from "../utils/imageHelper";

export default function MaterialCard({ material, onOpen }) {
  const imageSrc = getImageSrc(material.capa, material.titulo);
  
  return (
    <div
      onClick={onOpen}
      className="bg-panel rounded-lg overflow-hidden cursor-pointer group"
    >
      <div className="h-48 bg-[#061019] flex items-center justify-center overflow-hidden relative">
        {imageSrc ? (
          <img
            src={imageSrc}
            alt={`Capa de ${material.titulo}`}
            className="h-full w-full object-cover"
            onError={(e) => {
              e.target.style.display = 'none';
            }}
          />
        ) : null}
        {!imageSrc && (
          <span className="text-gray-500 text-sm">Sem imagem</span>
        )}
      </div>
      <div className="p-4">
        <h3 className="font-semibold text-base truncate group-hover:text-accent">
          {material.titulo}
        </h3>
        <p className="text-sm text-gray-400 truncate">{material.autor}</p>
        <div className="flex items-center mt-2 text-xs text-yellow-400">
          <Star size={14} className="mr-1" /> {material.avaliacao || 0}
        </div>
      </div>
    </div>
  );
}
