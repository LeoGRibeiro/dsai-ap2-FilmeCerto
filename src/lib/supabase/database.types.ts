export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      contagem_climas: {
        Row: {
          dia: string;
          pergunta: string;
          resposta: string;
          total: number;
        };
        Insert: {
          dia: string;
          pergunta: string;
          resposta: string;
          total?: number;
        };
        Update: {
          dia?: string;
          pergunta?: string;
          resposta?: string;
          total?: number;
        };
        Relationships: [];
      };
      equipe_metricas: {
        Row: {
          usuario_id: string;
        };
        Insert: {
          usuario_id: string;
        };
        Update: {
          usuario_id?: string;
        };
        Relationships: [];
      };
      escolhas_noite: {
        Row: {
          escolhido_em: string;
          id: number;
          perguntado_em: string | null;
          respondido_em: string | null;
          tipo: Database["public"]["Enums"]["tipo_midia"];
          titulo: string;
          tmdb_id: number;
          usuario_id: string;
          vezes_perguntado: number;
        };
        Insert: {
          escolhido_em?: string;
          id?: never;
          perguntado_em?: string | null;
          respondido_em?: string | null;
          tipo?: Database["public"]["Enums"]["tipo_midia"];
          titulo: string;
          tmdb_id: number;
          usuario_id?: string;
          vezes_perguntado?: number;
        };
        Update: {
          escolhido_em?: string;
          id?: never;
          perguntado_em?: string | null;
          respondido_em?: string | null;
          tipo?: Database["public"]["Enums"]["tipo_midia"];
          titulo?: string;
          tmdb_id?: number;
          usuario_id?: string;
          vezes_perguntado?: number;
        };
        Relationships: [];
      };
      eventos: {
        Row: {
          criado_em: string;
          dados: Json;
          id: number;
          nome: string;
          usuario_id: string;
        };
        Insert: {
          criado_em?: string;
          dados?: Json;
          id?: never;
          nome: string;
          usuario_id?: string;
        };
        Update: {
          criado_em?: string;
          dados?: Json;
          id?: never;
          nome?: string;
          usuario_id?: string;
        };
        Relationships: [];
      };
      lista_itens: {
        Row: {
          adicionado_em: string;
          ano: number | null;
          atualizado_em: string;
          generos: number[];
          poster_path: string | null;
          status: Database["public"]["Enums"]["status_lista"];
          tipo: Database["public"]["Enums"]["tipo_midia"];
          titulo: string;
          tmdb_id: number;
          usuario_id: string;
        };
        Insert: {
          adicionado_em?: string;
          ano?: number | null;
          atualizado_em?: string;
          generos?: number[];
          poster_path?: string | null;
          status: Database["public"]["Enums"]["status_lista"];
          tipo?: Database["public"]["Enums"]["tipo_midia"];
          titulo: string;
          tmdb_id: number;
          usuario_id: string;
        };
        Update: {
          adicionado_em?: string;
          ano?: number | null;
          atualizado_em?: string;
          generos?: number[];
          poster_path?: string | null;
          status?: Database["public"]["Enums"]["status_lista"];
          tipo?: Database["public"]["Enums"]["tipo_midia"];
          titulo?: string;
          tmdb_id?: number;
          usuario_id?: string;
        };
        Relationships: [];
      };
      perfis: {
        Row: {
          atualizado_em: string;
          criado_em: string;
          id: string;
          nome: string;
        };
        Insert: {
          atualizado_em?: string;
          criado_em?: string;
          id: string;
          nome: string;
        };
        Update: {
          atualizado_em?: string;
          criado_em?: string;
          id?: string;
          nome?: string;
        };
        Relationships: [];
      };
      preferencias: {
        Row: {
          atualizado_em: string;
          criado_em: string;
          duracao: Database["public"]["Enums"]["duracao_preferida"];
          frequencia: Database["public"]["Enums"]["frequencia_assistir"];
          generos: number[];
          generos_evitados: number[];
          streamings: number[];
          usuario_id: string;
        };
        Insert: {
          atualizado_em?: string;
          criado_em?: string;
          duracao: Database["public"]["Enums"]["duracao_preferida"];
          frequencia: Database["public"]["Enums"]["frequencia_assistir"];
          generos: number[];
          generos_evitados?: number[];
          streamings?: number[];
          usuario_id: string;
        };
        Update: {
          atualizado_em?: string;
          criado_em?: string;
          duracao?: Database["public"]["Enums"]["duracao_preferida"];
          frequencia?: Database["public"]["Enums"]["frequencia_assistir"];
          generos?: number[];
          generos_evitados?: number[];
          streamings?: number[];
          usuario_id?: string;
        };
        Relationships: [];
      };
      reacoes: {
        Row: {
          atualizado_em: string;
          criado_em: string;
          generos: number[];
          reacao: Database["public"]["Enums"]["reacao_filme"];
          tipo: Database["public"]["Enums"]["tipo_midia"];
          titulo: string;
          tmdb_id: number;
          usuario_id: string;
        };
        Insert: {
          atualizado_em?: string;
          criado_em?: string;
          generos?: number[];
          reacao: Database["public"]["Enums"]["reacao_filme"];
          tipo?: Database["public"]["Enums"]["tipo_midia"];
          titulo: string;
          tmdb_id: number;
          usuario_id: string;
        };
        Update: {
          atualizado_em?: string;
          criado_em?: string;
          generos?: number[];
          reacao?: Database["public"]["Enums"]["reacao_filme"];
          tipo?: Database["public"]["Enums"]["tipo_midia"];
          titulo?: string;
          tmdb_id?: number;
          usuario_id?: string;
        };
        Relationships: [];
      };
      salas_noite: {
        Row: {
          convidado_id: string | null;
          criada_em: string;
          criador_id: string;
          expira_em: string;
          id: string;
          respostas_convidado: Json | null;
          respostas_criador: Json | null;
          resultado: Json | null;
        };
        Insert: {
          convidado_id?: string | null;
          criada_em?: string;
          criador_id?: string;
          expira_em?: string;
          id?: string;
          respostas_convidado?: Json | null;
          respostas_criador?: Json | null;
          resultado?: Json | null;
        };
        Update: {
          convidado_id?: string | null;
          criada_em?: string;
          criador_id?: string;
          expira_em?: string;
          id?: string;
          respostas_convidado?: Json | null;
          respostas_criador?: Json | null;
          resultado?: Json | null;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      concluir_sala_noite: {
        Args: { p_resultado: Json; p_sala: string };
        Returns: boolean;
      };
      criar_sala_noite: {
        Args: { p_segundos?: number };
        Returns: string;
      };
      entrar_sala_noite: {
        Args: { p_sala: string };
        Returns: string;
      };
      metricas_climas: {
        Args: never;
        Returns: {
          pergunta: string;
          resposta: string;
          total: number;
        }[];
      };
      metricas_detalhes: {
        Args: never;
        Returns: {
          chave: string;
          nome: string;
          sem_equipe: number;
          total: number;
          valor: string;
        }[];
      };
      metricas_eventos: {
        Args: never;
        Returns: {
          nome: string;
          pessoas: number;
          sem_equipe: number;
          total: number;
        }[];
      };
      registrar_clima: {
        Args: { p_companhia: string; p_experiencia: string; p_humor: string };
        Returns: undefined;
      };
      responder_sala_noite: {
        Args: { p_companhia: string; p_experiencia: string; p_humor: string; p_sala: string };
        Returns: undefined;
      };
      restricoes_sala_noite: {
        Args: { p_sala: string };
        Returns: {
          evitados: number[];
          excluir: number[];
          respostas_convidado: Json;
          respostas_criador: Json;
          streamings: number[];
        }[];
      };
    };
    Enums: {
      duracao_preferida: "curta" | "media" | "longa" | "indiferente";
      frequencia_assistir: "raramente" | "mensal" | "semanal" | "diaria";
      reacao_filme: "nao-gostei" | "gostei" | "amei";
      status_lista: "quero_assistir" | "assistido";
      tipo_midia: "filme" | "serie";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema["CompositeTypes"] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      duracao_preferida: ["curta", "media", "longa", "indiferente"],
      frequencia_assistir: ["raramente", "mensal", "semanal", "diaria"],
      reacao_filme: ["nao-gostei", "gostei", "amei"],
      status_lista: ["quero_assistir", "assistido"],
      tipo_midia: ["filme", "serie"],
    },
  },
} as const;
