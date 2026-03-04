interface CardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: string;
}

export function Card({ title, value, subtitle, icon }: CardProps) {
  return (
    <div className="bg-[#111827] border border-[#1e293b] rounded-xl p-6 hover:border-blue-500/30 transition-colors">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-400 font-medium">{title}</p>
          <p className="text-3xl font-bold mt-2 text-white">{value}</p>
          {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
        </div>
        {icon && <span className="text-3xl">{icon}</span>}
      </div>
    </div>
  );
}
