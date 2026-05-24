import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { useSubmitClaim } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { ShieldCheck } from "lucide-react";

const formSchema = z.object({
  name: z.string().min(2, { message: "Nome deve ter pelo menos 2 caracteres." }),
  fullName: z.string().min(5, { message: "Nome completo é obrigatório." }),
  country: z.string().min(2, { message: "País é obrigatório." }),
  birthYear: z.coerce.number().min(1900).max(new Date().getFullYear()),
  email: z.string().email({ message: "Email inválido." }).optional().or(z.literal("")),
  documentType: z.string().optional(),
});

export function Claim() {
  const { toast } = useToast();
  const submitClaim = useSubmitClaim();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      fullName: "",
      country: "",
      birthYear: 2000,
      email: "",
      documentType: "",
    },
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    submitClaim.mutate(
      { data: values },
      {
        onSuccess: (data) => {
          toast({
            title: "Reivindicação submetida",
            description: `Seu ID de acompanhamento: ${data.id}`,
          });
          form.reset();
        },
        onError: () => {
          toast({
            variant: "destructive",
            title: "Erro ao submeter",
            description: "Ocorreu um erro ao processar sua reivindicação.",
          });
        }
      }
    );
  }

  return (
    <div className="flex-1 container mx-auto px-4 py-16 max-w-3xl">
      <div className="text-center mb-16">
        <ShieldCheck className="w-16 h-16 mx-auto mb-6 text-accent" />
        <h1 className="text-4xl md:text-5xl font-bold tracking-tighter uppercase mb-4">Reivindicar Nome</h1>
        <p className="text-muted-foreground font-mono text-sm uppercase tracking-widest max-w-xl mx-auto leading-relaxed">
          O Índice da Civilização é construído pela humanidade. Se o seu nome não consta ou você deseja certificar sua existência oficial no índice, submeta sua reivindicação.
        </p>
      </div>

      <div className="border border-border bg-card p-8 md:p-12">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-mono uppercase text-xs tracking-widest">Nome Principal</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: JOÃO" className="font-mono uppercase" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="fullName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-mono uppercase text-xs tracking-widest">Nome Completo</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: JOÃO SILVA" className="font-mono uppercase" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="country"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-mono uppercase text-xs tracking-widest">País de Origem</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: BRASIL" className="font-mono uppercase" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="birthYear"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-mono uppercase text-xs tracking-widest">Ano de Nascimento</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="2000" className="font-mono uppercase" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="documentType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-mono uppercase text-xs tracking-widest">Tipo de Documento (Opcional)</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: PASSAPORTE, RG" className="font-mono uppercase" {...field} />
                    </FormControl>
                    <FormDescription className="font-mono text-[10px]">Apenas para auditoria.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-mono uppercase text-xs tracking-widest">Email (Opcional)</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="contato@exemplo.com" className="font-mono uppercase" {...field} />
                    </FormControl>
                    <FormDescription className="font-mono text-[10px]">Para receber o status da reivindicação.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <Button 
              type="submit" 
              className="w-full h-14 font-bold text-lg uppercase tracking-widest"
              disabled={submitClaim.isPending}
            >
              {submitClaim.isPending ? "Submetendo..." : "Registrar no Índice"}
            </Button>
          </form>
        </Form>
      </div>
    </div>
  );
}
