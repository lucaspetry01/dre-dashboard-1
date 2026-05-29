import {
  Fuel,
  FileText,
  Users,
  CreditCard,
  Briefcase,
  Wrench,
  Receipt,
  MapPin,
  Package,
  TrendingDown,
  type LucideIcon,
} from 'lucide-react';

export interface CategoryIconConfig {
  icon: LucideIcon;
  bgColor: string;
  iconColor: string;
  borderColor: string;
}

/**
 * Mapeia o nome da categoria para um ícone personalizado e paleta de cores.
 * Usa correspondência por palavras-chave para suportar variações de nomes.
 */
export function getCategoryIconConfig(categoryName: string): CategoryIconConfig {
  const name = categoryName.toUpperCase();

  // Impostos / Tributos / Outros (deve vir ANTES de Combustível pois 'IMPOSTOS' contém 'POSTO')
  if (name.includes('IMPOSTO') || name.includes('TRIBUTO') || name.includes('OUTROS')) {
    return {
      icon: Receipt,
      bgColor: 'bg-red-100',
      iconColor: 'text-red-600',
      borderColor: 'border-red-200',
    };
  }

  // Combustível / Posto
  if (name.includes('COMBUST') || name.includes('POSTO')) {
    return {
      icon: Fuel,
      bgColor: 'bg-orange-100',
      iconColor: 'text-orange-600',
      borderColor: 'border-orange-200',
    };
  }

  // Conta / Boleto / Saques
  if (name.includes('CONTA') || name.includes('BOLETO') || name.includes('SAQUE')) {
    return {
      icon: FileText,
      bgColor: 'bg-amber-100',
      iconColor: 'text-amber-600',
      borderColor: 'border-amber-200',
    };
  }

  // Chapa / Operacional PF
  if (name.includes('CHAPA') || name.includes('OPERACIONAL PF')) {
    return {
      icon: Users,
      bgColor: 'bg-cyan-100',
      iconColor: 'text-cyan-600',
      borderColor: 'border-cyan-200',
    };
  }

  // Pagamentos
  if (name.includes('PAGAMENTO')) {
    return {
      icon: CreditCard,
      bgColor: 'bg-blue-100',
      iconColor: 'text-blue-600',
      borderColor: 'border-blue-200',
    };
  }

  // Pró-labore / Societário
  if (name.includes('PRÓ-LABORE') || name.includes('PRO-LABORE') || name.includes('SOCIET')) {
    return {
      icon: Briefcase,
      bgColor: 'bg-purple-100',
      iconColor: 'text-purple-600',
      borderColor: 'border-purple-200',
    };
  }

  // Mecânica / Manutenção
  if (name.includes('MECÂNICA') || name.includes('MECANICA') || name.includes('MANUTEN')) {
    return {
      icon: Wrench,
      bgColor: 'bg-slate-100',
      iconColor: 'text-slate-700',
      borderColor: 'border-slate-200',
    };
  }

  // Pedágios / Tags
  if (name.includes('PEDÁGIO') || name.includes('PEDAGIO') || name.includes('TAGS')) {
    return {
      icon: MapPin,
      bgColor: 'bg-emerald-100',
      iconColor: 'text-emerald-600',
      borderColor: 'border-emerald-200',
    };
  }

  // Custo Operacional Específico
  if (name.includes('CUSTO') || name.includes('ESPECÍFICO') || name.includes('ESPECIFICO')) {
    return {
      icon: Package,
      bgColor: 'bg-indigo-100',
      iconColor: 'text-indigo-600',
      borderColor: 'border-indigo-200',
    };
  }

  // Default fallback
  return {
    icon: TrendingDown,
    bgColor: 'bg-slate-100',
    iconColor: 'text-slate-600',
    borderColor: 'border-slate-200',
  };
}

interface CategoryIconProps {
  categoryName: string;
  size?: 'sm' | 'md' | 'lg';
}

export default function CategoryIcon({ categoryName, size = 'md' }: CategoryIconProps) {
  const config = getCategoryIconConfig(categoryName);
  const Icon = config.icon;

  const sizeClasses = {
    sm: { container: 'w-8 h-8', icon: 'w-4 h-4' },
    md: { container: 'w-10 h-10', icon: 'w-5 h-5' },
    lg: { container: 'w-12 h-12', icon: 'w-6 h-6' },
  };

  return (
    <div
      className={`${sizeClasses[size].container} ${config.bgColor} ${config.borderColor} border rounded-lg flex items-center justify-center flex-shrink-0`}
    >
      <Icon className={`${sizeClasses[size].icon} ${config.iconColor}`} />
    </div>
  );
}
