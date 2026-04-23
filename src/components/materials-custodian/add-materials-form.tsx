
'use client';

import * as React from 'react';
import { useToast } from '@/hooks/use-toast';
import { useFirestore } from '@/firebase';
import { collection, writeBatch, doc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PlusCircle, Trash2, Loader2 } from 'lucide-react';
import type { InventoryItem } from '@/lib/types';

type NewMaterial = {
    id: number;
    name: string;
    quantity: number;
};

export function AddMaterialsForm({ onSubmissionSuccess }: { onSubmissionSuccess: () => void }) {
    const { toast } = useToast();
    const firestore = useFirestore();
    const [materials, setMaterials] = React.useState<NewMaterial[]>([{ id: 1, name: '', quantity: 1 }]);
    const [isLoading, setIsLoading] = React.useState(false);

    const handleAddItem = () => {
        setMaterials([...materials, { id: Date.now(), name: '', quantity: 1 }]);
    };

    const handleRemoveItem = (id: number) => {
        setMaterials(materials.filter(m => m.id !== id));
    };

    const handleInputChange = (id: number, field: 'name' | 'quantity', value: string) => {
        setMaterials(materials.map(m => {
            if (m.id === id) {
                if (field === 'quantity') {
                    return { ...m, [field]: parseInt(value, 10) || 0 };
                }
                return { ...m, [field]: value };
            }
            return m;
        }));
    };

    const handleSubmit = async () => {
        if (!firestore) {
            toast({ variant: 'destructive', title: 'Error', description: 'Database not connected.' });
            return;
        }
        const validMaterials = materials.filter(m => m.name.trim() !== '' && m.quantity > 0);
        if (validMaterials.length === 0) {
            toast({ variant: 'destructive', title: 'No Items', description: 'Please add at least one item with a name and quantity.' });
            return;
        }

        setIsLoading(true);

        try {
            const batch = writeBatch(firestore);
            const inventoryCollection = collection(firestore, 'inventory_items');

            validMaterials.forEach(material => {
                const newDocRef = doc(inventoryCollection);
                const itemData: Omit<InventoryItem, 'id' | 'description' | 'imageUrl' | 'imageHint'> = {
                    name: material.name,
                    quantity: material.quantity,
                    status: 'Pending Receipt',
                    createdAt: new Date().toISOString(),
                };
                batch.set(newDocRef, itemData as any);
            });

            await batch.commit();
            toast({ title: 'Success', description: `${validMaterials.length} item(s) sent for verification.` });
            setMaterials([{ id: 1, name: '', quantity: 1 }]);
            onSubmissionSuccess();
        } catch (error) {
            console.error('Error submitting materials:', error);
            toast({ variant: 'destructive', title: 'Submission Failed', description: 'An error occurred while sending items.' });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Card className="bg-card/80 backdrop-blur-sm border-border/50">
            <CardHeader>
                <CardTitle>Add New Materials for Provisioning</CardTitle>
                <CardDescription>
                    Create a list of new materials to be sent to the Head Supervisor for verification and assignment.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-2">
                    {materials.map((material, index) => (
                        <div key={material.id} className="flex items-end gap-4 p-4 rounded-lg bg-black/20">
                            <div className="grid gap-2 flex-1">
                                <Label htmlFor={`name-${material.id}`}>Item Name</Label>
                                <Input
                                    id={`name-${material.id}`}
                                    value={material.name}
                                    onChange={e => handleInputChange(material.id, 'name', e.target.value)}
                                    placeholder="e.g., Arduino Uno"
                                    required
                                />
                            </div>
                            <div className="grid gap-2 w-32">
                                <Label htmlFor={`quantity-${material.id}`}>Quantity</Label>
                                <Input
                                    id={`quantity-${material.id}`}
                                    type="number"
                                    value={material.quantity}
                                    onChange={e => handleInputChange(material.id, 'quantity', e.target.value)}
                                    min={1}
                                    required
                                />
                            </div>
                            <Button
                                type="button"
                                variant="destructive"
                                size="icon"
                                onClick={() => handleRemoveItem(material.id)}
                                disabled={materials.length === 1}
                            >
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </div>
                    ))}
                </div>
                <div className="flex justify-between items-center pt-4 border-t border-border/50">
                    <Button type="button" variant="outline" onClick={handleAddItem}>
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Add Another Item
                    </Button>
                    <Button onClick={handleSubmit} disabled={isLoading || materials.every(m => !m.name.trim())}>
                        {isLoading ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                            'Submit for Verification'
                        )}
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}
